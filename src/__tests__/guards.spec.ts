import { MAX_PAYLOAD_BYTES, isWritableSize, receives } from '../guards';

describe('isWritableSize', () => {
  it('accepts an ordinary screenshot', () => {
    expect(isWritableSize(3 * 1024 * 1024)).toBe(true);
  });

  it('accepts a payload exactly at the ceiling', () => {
    expect(isWritableSize(MAX_PAYLOAD_BYTES)).toBe(true);
  });

  it('refuses a payload over the ceiling', () => {
    expect(isWritableSize(MAX_PAYLOAD_BYTES + 1)).toBe(false);
    expect(isWritableSize(200 * 1024 * 1024)).toBe(false);
  });
});

describe('receives', () => {
  let host: HTMLElement;
  let inside: HTMLElement;
  let outside: HTMLElement;

  beforeEach(() => {
    host = document.createElement('div');
    inside = document.createElement('textarea');
    host.appendChild(inside);
    outside = document.createElement('input');
    document.body.append(host, outside);
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('accepts the host itself', () => {
    expect(receives(host, host)).toBe(true);
  });

  it('accepts a node inside the host', () => {
    expect(receives(host, inside)).toBe(true);
  });

  it('accepts a node nested deeper inside the host', () => {
    const deep = document.createElement('span');
    inside.appendChild(deep);
    expect(receives(host, deep)).toBe(true);
  });

  it('refuses a node outside the host, which is the hijack case', () => {
    expect(receives(host, outside)).toBe(false);
  });

  it('refuses when there is no host', () => {
    expect(receives(null, inside)).toBe(false);
    expect(receives(undefined, inside)).toBe(false);
  });

  it('refuses a target that is not a node', () => {
    expect(receives(host, null)).toBe(false);
    expect(receives(host, {} as EventTarget)).toBe(false);
  });
});
