import { describe, expect, test } from 'bun:test';
import type { Env } from '../types';
import { mintParticipantToken, verifyParticipantToken } from './tokens';

const env = { SESSION_SECRET: 'test-secret' } as Env;

describe('drops participant token', () => {
  test('mint then verify returns the same share + participant', async () => {
    const token = await mintParticipantToken(env, 'share_abc', 'p1');
    expect(await verifyParticipantToken(env, token)).toMatchObject({ sid: 'share_abc', pid: 'p1' });
  });
  test('a tampered payload is rejected', async () => {
    const token = await mintParticipantToken(env, 'share_abc', 'p1');
    const [, sig] = token.split('.');
    const forged = `${btoa('{"sid":"share_evil","pid":"p1","exp":9999999999999}').replace(/=/g, '')}.${sig}`;
    expect(await verifyParticipantToken(env, forged)).toBeNull();
  });
  test('a token signed with a different secret is rejected', async () => {
    const token = await mintParticipantToken({ SESSION_SECRET: 'other' } as Env, 'share_abc', 'p1');
    expect(await verifyParticipantToken(env, token)).toBeNull();
  });
  test('null/garbage tokens return null', async () => {
    expect(await verifyParticipantToken(env, null)).toBeNull();
    expect(await verifyParticipantToken(env, 'not-a-token')).toBeNull();
  });
});
