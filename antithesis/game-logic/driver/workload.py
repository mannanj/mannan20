"""Antithesis driver for the chicken game's logic.

A hegel concurrent state machine. Each rule draws inputs, sends one action to the
`gamelogic` server (which runs the game's real TypeScript modules), and checks the
response against what the driver knows. Per-call properties are asserted inside the
server; this driver asserts the cross-call ones (per-session histories).
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
import threading
import time
import urllib.error
import urllib.request

import hegel
from hegel import generators as gs
from antithesis.assertions import always, reachable
from antithesis.lifecycle import setup_complete

URL = os.environ.get("GAME_URL", "http://gamelogic:8080")
TIMEOUT = 2.0
MAX_SESSIONS = 6
NO_EVENTUALLY = os.environ.get("DRIVER_NO_EVENTUALLY") == "1"
EVENTUALLY_AFTER_S = float(os.environ.get("DRIVER_EVENTUALLY_AFTER_S", "0") or 0)

ORB_KINDS = [
    "multiply", "cursor5", "cursor3", "scatter", "aimbot", "frenzy", "eggs", "multiply5", "chain",
    "multiply10", "multiply25", "multiply100", "giant", "magnet", "mystery", "jev",
]
MYSTERY_KINDS = [
    "frenzy", "cursor5", "cursor3", "eggs", "multiply5", "multiply10", "chain", "giant", "magnet", "multiply25",
]


class Unavailable(Exception):
    """The request failed or timed out: its outcome is unknown."""


def request(path: str, body: dict | None = None, timeout: float = TIMEOUT) -> tuple[int, dict]:
    data = None if body is None else json.dumps(body).encode()
    req = urllib.request.Request(URL + path, data=data, headers={"content-type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.status, json.loads(resp.read() or b"{}")
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.loads(e.read() or b"{}")
        except Exception:
            return e.code, {}
    except Exception as e:  # connection refused, reset, timeout
        raise Unavailable(str(e)) from e


def op(body: dict) -> tuple[int, dict]:
    return request("/op", body)


def log(msg: str) -> None:
    print(f"[driver] {msg}", flush=True)


class Session:
    def __init__(self, sid: str, boot: str) -> None:
        self.sid = sid
        self.boot = boot
        self.max_score = 0
        self.fired: list[str] = []


class Game(hegel.StateMachine):
    def __init__(self) -> None:
        self.lock = threading.Lock()
        self.sessions: list[Session] = []
        self.eventually_lock = threading.Lock()
        self.started = time.monotonic()

    # ---- helpers ---------------------------------------------------------------------
    def _new_session(self) -> Session | None:
        try:
            status, r = op({"op": "new"})
        except Unavailable:
            return None
        if status != 200:
            return None
        s = Session(r["sid"], r["boot"])
        with self.lock:
            self.sessions.append(s)
            if len(self.sessions) > MAX_SESSIONS:
                self.sessions.pop(0)
        return s

    def _session(self, tc: hegel.TestCase) -> Session | None:
        with self.lock:
            n = len(self.sessions)
        if n == 0 or (n < MAX_SESSIONS and tc.draw(gs.weighted_booleans(0.05))):
            return self._new_session()
        i = tc.draw(gs.integers(min_value=0, max_value=n - 1))
        with self.lock:
            return self.sessions[i] if i < len(self.sessions) else None

    def _lost(self, s: Session, r: dict) -> None:
        """The server forgot the session: it restarted. Drop it from the model."""
        # Only happens when the server restarts (not under the `resilient` fault profile).
        log(f"session {s.sid} lost: server boot {s.boot} -> {r.get('boot')}")
        with self.lock:
            if s in self.sessions:
                self.sessions.remove(s)

    def _rng(self, tc: hegel.TestCase) -> list[float]:
        special = gs.sampled_from([0.0, 0.5, 0.999999999])
        uniform = gs.floats(min_value=0.0, max_value_exclusive=1.0)
        return tc.draw(gs.lists(gs.one_of(special, uniform), min_size=1, max_size=6))

    # ---- rules -----------------------------------------------------------------------
    @hegel.rule(groups=["game"], weight=8)
    def click(self, tc: hegel.TestCase) -> None:
        s = self._session(tc)
        if s is None:
            return
        n = tc.draw(gs.integers(min_value=1, max_value=3))
        bonus = tc.draw(gs.sampled_from([0, 0, 0, 0, 5, 100, 100, 500, 2000]))
        with self.lock:
            before = s.max_score
        try:
            status, r = op({"op": "click", "sid": s.sid, "n": n, "bonus": bonus})
        except Unavailable:
            return
        if status == 410:
            return self._lost(s, r)
        if status != 200:
            always(False, "game logic actions succeed", {"op": "click", "status": status, "body": r})
            return
        crossed = r.get("crossed", [])
        with self.lock:
            dup = [k for k in crossed if k in s.fired]
            s.fired.extend(crossed)
            s.max_score = max(s.max_score, r["score"])
        always(r["score"] >= before + n + bonus, "a click never lowers a session's score",
               {"before": before, "n": n, "bonus": bonus, "score": r["score"]})
        always(not dup, "each threshold orb fires at most once per session", {"dup": dup, "crossed": crossed})

    @hegel.rule(groups=["game"], weight=3)
    def tick(self, tc: hegel.TestCase) -> None:
        s = self._session(tc)
        if s is None:
            return
        dt = tc.draw(gs.sampled_from([1, 16, 250, 1000, 5000, 60_000, 600_000]))
        try:
            status, r = op({"op": "tick", "sid": s.sid, "dt": dt})
        except Unavailable:
            return
        if status == 410:
            self._lost(s, r)

    @hegel.rule(groups=["game"], weight=4)
    def toss(self, tc: hegel.TestCase) -> None:
        speed = gs.one_of(gs.sampled_from([0.0, 1.0, 5.99, 6.0, 38.0, 1e6]), gs.floats(min_value=-200.0, max_value=200.0))
        size = gs.one_of(gs.sampled_from([0, 10, 50, 140, 375, 800, 1280, 3840]), gs.integers(min_value=0, max_value=4000))
        vw = tc.draw(size)
        vh = tc.draw(size)
        body = {
            "op": "toss",
            "vx": tc.draw(speed) * tc.draw(gs.sampled_from([1, -1])),
            "vy": tc.draw(speed) * tc.draw(gs.sampled_from([1, -1])),
            "level": tc.draw(gs.integers(min_value=0, max_value=3)),
            "vw": vw,
            "vh": vh,
            "groundY": max(0, vh - tc.draw(gs.sampled_from([0, 40, 120]))),
            "dt": tc.draw(gs.sampled_from([0.25, 1.0, 2.0, 4.0, 16.0])),
            "steps": tc.draw(gs.integers(min_value=1, max_value=400)),
        }
        try:
            op(body)
        except Unavailable:
            pass

    @hegel.rule(groups=["game"], weight=2)
    def ragdoll(self, tc: hegel.TestCase) -> None:
        body = {
            "op": "ragdoll",
            "rot": tc.draw(gs.floats(min_value=-70.0, max_value=70.0)),
            "rv": tc.draw(gs.one_of(gs.sampled_from([0.0, 1e3, -1e3]), gs.floats(min_value=-50.0, max_value=50.0))),
            "ax": tc.draw(gs.one_of(gs.sampled_from([0.0, 100.0, -100.0]), gs.floats(min_value=-10.0, max_value=10.0))),
            "dt": tc.draw(gs.sampled_from([0.25, 1.0, 4.0, 16.0])),
            "steps": tc.draw(gs.integers(min_value=1, max_value=300)),
        }
        try:
            op(body)
        except Unavailable:
            pass

    @hegel.rule(groups=["game"], weight=1)
    def hitbox_and_cursors(self, tc: hegel.TestCase) -> None:
        try:
            op({"op": "hitbox", "level": tc.draw(gs.integers(min_value=0, max_value=3))})
            op({"op": "cursors", "x5": tc.draw(gs.booleans()), "x3": tc.draw(gs.booleans())})
        except Unavailable:
            pass

    @hegel.rule(groups=["game"], weight=6)
    def pick_orb(self, tc: hegel.TestCase) -> None:
        s = self._session(tc)
        if s is None:
            return
        body: dict = {
            "op": "pick_orb",
            "sid": s.sid,
            "behind": tc.draw(gs.sampled_from([0.0, 0.1, 0.2, 0.3, 0.39, 0.4, 0.6, 0.9, 1.0])),
            "ahead": tc.draw(gs.weighted_booleans(0.3)),
            "jevHeld": tc.draw(gs.booleans()),
            "aimbotOwned": tc.draw(gs.booleans()),
            "lastKinds": tc.draw(gs.lists(gs.sampled_from(ORB_KINDS), max_size=2)),
            "activeKinds": tc.draw(gs.lists(gs.sampled_from(ORB_KINDS), max_size=3)),
            "clones": tc.draw(gs.sampled_from([0, 3, 4, 20, 21, 150])),
            "goldens": tc.draw(gs.integers(min_value=0, max_value=4)),
            "sinceBigMs": tc.draw(gs.sampled_from([0, 60_000, 149_999, 150_000, 10**9])),
            "sinceMultiplyEndMs": tc.draw(gs.sampled_from([0, 9_999, 10_000, 10**9])),
            "rng": self._rng(tc),
        }
        if tc.draw(gs.weighted_booleans(0.5)):
            body["score"] = tc.draw(gs.sampled_from([0, 100, 175, 450, 700, 1000, 1500, 2000, 5000, 30_000]))
        pool = tc.draw(gs.sampled_from(["none", "era", "era", "subset"]))
        if pool == "era":
            body["pool"] = "era"
            body["eraIndex"] = tc.draw(gs.integers(min_value=0, max_value=20))
            body["lap"] = tc.draw(gs.integers(min_value=1, max_value=3))
            body["creatureOnScreen"] = tc.draw(gs.booleans())
        elif pool == "subset":
            body["pool"] = tc.draw(gs.lists(gs.sampled_from(ORB_KINDS), min_size=0, max_size=4, unique=True))
        try:
            status, r = op(body)
        except Unavailable:
            return
        if status == 410:
            return self._lost(s, r)
        always(status == 200, "game logic actions succeed", {"op": "pick_orb", "status": status, "body": r})

    @hegel.rule(groups=["game"], weight=2)
    def mystery(self, tc: hegel.TestCase) -> None:
        last = tc.draw(gs.one_of(gs.just(None), gs.sampled_from(MYSTERY_KINDS)))
        try:
            op({"op": "mystery", "last": last, "rng": self._rng(tc)})
        except Unavailable:
            pass

    @hegel.rule(groups=["game"], weight=3)
    def freeze(self, tc: hegel.TestCase) -> None:
        s = self._session(tc)
        if s is None:
            return
        gap = gs.sampled_from([0, 60, 125, 125, 125, 300, 1000, 5000, 15_000])
        shots = tc.draw(gs.lists(gap, min_size=1, max_size=60))
        try:
            status, r = op({"op": "freeze", "sid": s.sid, "shots": shots, "rng": self._rng(tc)})
        except Unavailable:
            return
        if status == 410:
            self._lost(s, r)

    @hegel.rule(groups=["game"], weight=2)
    def check_state(self, tc: hegel.TestCase) -> None:
        s = self._session(tc)
        if s is None:
            return
        with self.lock:
            known = list(s.fired)
            known_score = s.max_score
        try:
            status, r = op({"op": "state", "sid": s.sid})
        except Unavailable:
            return
        if status == 410:
            return self._lost(s, r)
        fired = r.get("fired", [])
        always(len(fired) == len(set(fired)), "the server's fired-orb log has no duplicates", {"fired": fired})
        always(set(known) <= set(fired), "every orb a click reported as fired is in the session's log",
               {"known": known, "server": fired})
        always(r.get("score", -1) >= known_score, "a session's score never goes backwards",
               {"known": known_score, "server": r.get("score")})

    @hegel.rule(groups=["game"])
    def eventually_rule(self, tc: hegel.TestCase) -> None:
        if NO_EVENTUALLY:
            return
        due = EVENTUALLY_AFTER_S > 0 and time.monotonic() - self.started >= EVENTUALLY_AFTER_S
        if due or (EVENTUALLY_AFTER_S == 0 and tc.draw(gs.weighted_booleans(0.002))):
            self.eventually()

    # ---- eventually ------------------------------------------------------------------
    def eventually(self) -> None:
        with self.eventually_lock:
            stop = os.environ.get("ANTITHESIS_STOP_FAULTS")
            if stop:
                subprocess.run([stop, "3600"], check=False)
            log("eventually: faults stopped, waiting for the server")
            deadline = time.monotonic() + 120
            up = False
            while time.monotonic() < deadline:
                try:
                    if request("/health")[0] == 200:
                        up = True
                        break
                except Unavailable:
                    pass
                time.sleep(0.5)
            log("eventually: assertions start")
            always(up, "the game logic server serves again after faults stop", {})
            if up:
                with self.lock:
                    sessions = list(self.sessions)
                for s in sessions:
                    # Snapshot the model before the request: a click finishing after the read
                    # would otherwise be in the model but not in the state the server returned.
                    with self.lock:
                        known = list(s.fired)
                    try:
                        status, r = op({"op": "state", "sid": s.sid})
                    except Unavailable:
                        always(False, "every live session is readable after faults stop", {"sid": s.sid})
                        continue
                    if status == 410:
                        continue  # the server restarted; sessions are in memory by design
                    always(status == 200 and set(known) <= set(r.get("fired", [])),
                           "every live session is readable after faults stop",
                           {"sid": s.sid, "status": status, "known": known, "server": r})
            log("eventually: ending the timeline")
            sys.stdout.flush()
            os._exit(0)


def wait_for_server() -> None:
    last = None
    while True:
        try:
            status, r = request("/health")
            if status == 200:
                log(f"server up, boot={r.get('boot')}")
                return
            msg = f"health returned {status}"
        except Unavailable as e:
            msg = f"waiting for {URL}: {e}"
        if msg != last:
            log(msg)
            last = msg
        time.sleep(0.5)


def startup() -> None:
    wait_for_server()
    setup_complete({"url": URL})
    log("setup complete; waiting for /workload-active")
    while not os.path.exists("/workload-active"):
        time.sleep(0.1)
    reachable("the workload starts", {})


@hegel.main(phases=[hegel.Phase.generate])
def workload(tc: hegel.TestCase) -> None:
    hegel.run_state_machine(tc, Game(), steps=2**63 - 1, min_concurrency=2, max_concurrency=4)


if __name__ == "__main__":
    startup()
    workload()
