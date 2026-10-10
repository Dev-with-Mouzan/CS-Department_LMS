import time
import unittest

from app.services.cache import cached, _store


class CacheTest(unittest.TestCase):
    def setUp(self):
        _store.clear()

    def test_hit_does_not_recompute(self):
        calls = []

        def fn():
            calls.append(1)
            return "v"

        self.assertEqual(cached("k", fn), "v")
        self.assertEqual(cached("k", fn), "v")
        self.assertEqual(len(calls), 1)

    def test_expiry_recomputes(self):
        calls = []

        def fn():
            calls.append(1)
            return len(calls)

        self.assertEqual(cached("k2", fn, ttl=0.05), 1)
        time.sleep(0.06)
        self.assertEqual(cached("k2", fn, ttl=0.05), 2)

    def test_expired_entries_purged(self):
        cached("k3", lambda: 1, ttl=0.01)
        time.sleep(0.02)
        cached("k4", lambda: 2, ttl=60)
        self.assertNotIn("k3", _store)
        self.assertIn("k4", _store)


if __name__ == "__main__":
    unittest.main()
