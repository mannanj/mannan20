// Keeps a Samsung S34H55xG in full-range RGB on Apple Silicon. See README.md.
// Uses private IOMobileFramebuffer calls; no root or SIP change needed.
#include <CoreFoundation/CoreFoundation.h>
#include <IOKit/IOKitLib.h>
#include <dlfcn.h>
#include <stdio.h>
#include <string.h>
#include <time.h>
#include <unistd.h>

static int (*fbOpen)(io_service_t, task_port_t, uint32_t, void **);
static int (*fbGet)(void *, uint32_t *, uint32_t *);
static int (*fbSet)(void *, uint32_t, uint32_t);

static long num(CFDictionaryRef d, CFStringRef k) {
    long v = -1;
    CFTypeRef x = CFDictionaryGetValue(d, k);
    if (x && CFGetTypeID(x) == CFNumberGetTypeID()) CFNumberGetValue(x, kCFNumberLongType, &v);
    else if (x && CFGetTypeID(x) == CFBooleanGetTypeID()) v = CFBooleanGetValue(x);
    return v;
}

static CFTypeRef prop(io_service_t s, CFStringRef k, CFTypeID type) {
    CFTypeRef x = IORegistryEntryCreateCFProperty(s, k, NULL, 0);
    if (x && CFGetTypeID(x) != type) { CFRelease(x); x = NULL; }
    return x;
}

static int isTarget(io_service_t s) {
    CFDictionaryRef a = prop(s, CFSTR("DisplayAttributes"), CFDictionaryGetTypeID());
    if (!a) return 0;
    CFDictionaryRef p = CFDictionaryGetValue(a, CFSTR("ProductAttributes"));
    CFStringRef m = p ? CFDictionaryGetValue(p, CFSTR("ManufacturerID")) : NULL;
    CFStringRef n = p ? CFDictionaryGetValue(p, CFSTR("ProductName")) : NULL;
    int ok = m && n && CFEqual(m, CFSTR("SAM")) && CFEqual(n, CFSTR("LS34H55xG"));
    CFRelease(a);
    return ok;
}

// The color modes macOS itself lists as valid for this timing. Caller releases.
static CFArrayRef modesFor(io_service_t s, uint32_t timing) {
    CFArrayRef ts = prop(s, CFSTR("TimingElements"), CFArrayGetTypeID()), out = NULL;
    if (!ts) return NULL;
    for (CFIndex i = 0; i < CFArrayGetCount(ts); i++) {
        CFDictionaryRef t = CFArrayGetValueAtIndex(ts, i);
        if (num(t, CFSTR("ID")) != (long)timing) continue;
        out = CFDictionaryGetValue(t, CFSTR("ColorModes"));
        if (out) CFRetain(out);
        break;
    }
    CFRelease(ts);
    return out;
}

static CFDictionaryRef findMode(CFArrayRef ms, uint32_t id) {
    for (CFIndex i = 0; ms && i < CFArrayGetCount(ms); i++) {
        CFDictionaryRef m = CFArrayGetValueAtIndex(ms, i);
        if (num(m, CFSTR("ID")) == (long)id) return m;
    }
    return NULL;
}

// Same depth and SDR/HDR state as now; only encoding and range change.
static CFDictionaryRef pick(CFArrayRef ms, CFDictionaryRef cur, int rgb) {
    CFDictionaryRef best = NULL;
    for (CFIndex i = 0; i < CFArrayGetCount(ms); i++) {
        CFDictionaryRef m = CFArrayGetValueAtIndex(ms, i);
        int match = rgb ? num(m, CFSTR("PixelEncoding")) == 0 && num(m, CFSTR("DynamicRange")) == 0
                        : num(m, CFSTR("PixelEncoding")) != 0;
        if (!match || num(m, CFSTR("IsVirtual")) == 1) continue;
        if (num(m, CFSTR("Depth")) != num(cur, CFSTR("Depth"))) continue;
        if (num(m, CFSTR("EOTF")) != num(cur, CFSTR("EOTF"))) continue;
        if (!best || num(m, CFSTR("Score")) > num(best, CFSTR("Score"))) best = m;
    }
    return best;
}

static void show(const char *label, CFDictionaryRef m, uint32_t timing) {
    char ts[32];
    time_t now = time(NULL);
    strftime(ts, sizeof ts, "%F %T", localtime(&now));
    printf("%s %s: %s, %s range, %ld-bit (color %ld, timing %u)\n", ts, label,
           num(m, CFSTR("PixelEncoding")) == 0 ? "RGB" : "YCbCr",
           num(m, CFSTR("DynamicRange")) == 0 ? "full" : "limited",
           num(m, CFSTR("Depth")), num(m, CFSTR("ID")), timing);
}

// want: 0 status, 1 RGB, 2 YCbCr. Returns 0 ok, 1 failed, 2 not connected, 3 changed.
static int run(int want, int quiet) {
    io_iterator_t it;
    io_service_t s;
    int result = 2;
    if (IOServiceGetMatchingServices(0, IOServiceMatching("IOMobileFramebufferShim"), &it)) return 1;
    while ((s = IOIteratorNext(it))) {
        void *c = NULL;
        uint32_t color = 0, timing = 0;
        if (isTarget(s) && !fbOpen(s, mach_task_self(), 0, &c) && c) {
            if (!fbGet(c, &color, &timing)) {
                CFArrayRef ms = modesFor(s, timing);
                CFDictionaryRef cur = findMode(ms, color);
                result = cur ? 0 : 1;
                if (cur && !quiet) show("current", cur, timing);
                int isRGB = cur && num(cur, CFSTR("PixelEncoding")) == 0;
                int isFull = cur && num(cur, CFSTR("DynamicRange")) == 0;
                if (cur && want && !(want == 1 ? isRGB && isFull : !isRGB)) {
                    CFDictionaryRef m = pick(ms, cur, want == 1);
                    result = 1;
                    if (!m) {
                        if (!quiet) puts("no suitable mode offered");
                    } else if (!fbSet(c, (uint32_t)num(m, CFSTR("ID")), timing)) {
                        uint32_t c2 = 0, t2 = 0;
                        sleep(2);
                        if (!fbGet(c, &c2, &t2) && (long)c2 == num(m, CFSTR("ID"))) {
                            show("switched", m, t2);
                            result = 3;
                        } else puts("macOS did not keep the new mode");
                    }
                }
                if (ms) CFRelease(ms);
            } else result = 1;
        }
        if (c) CFRelease(c);
        IOObjectRelease(s);
    }
    IOObjectRelease(it);
    if (result == 2 && !quiet) puts("LS34H55xG not connected");
    fflush(stdout);
    return result;
}

int main(int argc, char **argv) {
    const char *cmd = argc > 1 ? argv[1] : "status";
    void *h = dlopen("/System/Library/PrivateFrameworks/IOMobileFramebuffer.framework/IOMobileFramebuffer", RTLD_NOW);
    if (h) {
        fbOpen = dlsym(h, "IOMobileFramebufferOpen");
        fbGet = dlsym(h, "IOMobileFramebufferGetDigitalOutMode");
        fbSet = dlsym(h, "IOMobileFramebufferSetDigitalOutMode");
    }
    if (!fbOpen || !fbGet || !fbSet) { puts("display API missing on this macOS"); return 1; }
    int r;
    if (!strcmp(cmd, "status")) r = run(0, 0);
    else if (!strcmp(cmd, "fix")) r = run(1, 0);
    else if (!strcmp(cmd, "undo")) r = run(2, 0);
    else if (!strcmp(cmd, "watch")) {
        // Back off when macOS keeps reverting, so the screen never flashes in a loop.
        int streak = 0;
        for (;;) {
            r = run(1, 1);
            streak = (r == 1 || r == 3) ? streak + 1 : 0;
            if (streak >= 3) {
                puts("mode keeps reverting; waiting 10 minutes");
                fflush(stdout);
                sleep(600);
                streak = 0;
            } else sleep(10);
        }
    } else { puts("usage: samsung-rgb status|fix|undo|watch"); return 64; }
    return r == 3 ? 0 : r;
}
