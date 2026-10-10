"""Tiny in-process TTL cache.

ponytail: process-local dict; single uvicorn worker only. If we ever run
multiple workers, replace with Redis or per-worker acceptable staleness.
"""
import time

_store: dict = {}


def cached(key: str, fn, ttl: int = 60):
    """Return cached value for key, computing fn() on miss/expiry.

    O(n) expiry purge per call — fine for a few hundred keys; swap for an
    LRU if the store ever grows beyond that.
    """
    now = time.time()
    for k, (exp, _) in list(_store.items()):
        if exp <= now:
            del _store[k]
    hit = _store.get(key)
    if hit is not None:
        return hit[1]
    val = fn()
    _store[key] = (now + ttl, val)
    return val
