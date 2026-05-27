"""Tests for short_answer validation logic without requiring a running server."""
import re
import sys


def validate_postal_code_prefix(value: str, is_required: bool = True):
    """Replicate the validation logic that should happen client-side and server-side."""
    if not value:
        if is_required:
            return False, "Answer is required"
        return True, None

    val = value.strip().upper()
    if len(val) > 3:
        return False, f"Exceeds max length of 3 (got {len(val)})"

    if not re.match(r'^[A-Z][0-9][A-Z]$', val):
        return False, f"Does not match format A1A (got {val})"

    return True, val


def run_tests():
    failures = 0

    # Valid inputs
    valid_cases = ["M5V", "A1B", "K0A", "K1A"]
    for v in valid_cases:
        ok, result = validate_postal_code_prefix(v)
        if not ok:
            print(f"FAIL: Expected valid but got '{result}' for input '{v}'")
            failures += 1
        elif result != v:
            print(f"FAIL: Expected normalized '{v}' but got '{result}'")
            failures += 1
        else:
            print(f"PASS: '{v}' is valid")

    # Normalization from lowercase
    lower_cases = [("m5v", "M5V"), ("a1b", "A1B")]
    for inp, expected in lower_cases:
        ok, result = validate_postal_code_prefix(inp)
        if not ok:
            print(f"FAIL: Expected valid but got '{result}' for lowercase input '{inp}'")
            failures += 1
        elif result != expected:
            print(f"FAIL: Expected '{expected}' but got '{result}' for input '{inp}'")
            failures += 1
        else:
            print(f"PASS: '{inp}' normalized to '{result}'")

    # Mixed case
    mixed_cases = [("M5v", "M5V"), ("a1B", "A1B")]
    for inp, expected in mixed_cases:
        ok, result = validate_postal_code_prefix(inp)
        if not ok:
            print(f"FAIL: Expected valid but got '{result}' for mixed case input '{inp}'")
            failures += 1
        elif result != expected:
            print(f"FAIL: Expected '{expected}' but got '{result}' for input '{inp}'")
            failures += 1
        else:
            print(f"PASS: mixed case '{inp}' -> '{result}'")

    # Invalid inputs
    invalid_cases = [
        ("123", "format"),
        ("M55", "format"),
        ("M5VV", "length"),
        ("m*v", "format"),
        ("ab", "format"),
    ]
    for inp, reason in invalid_cases:
        ok, result = validate_postal_code_prefix(inp)
        if ok:
            print(f"FAIL: Expected invalid ({reason}) but got valid for '{inp}'")
            failures += 1
        else:
            print(f"PASS: '{inp}' rejected ({reason})")

    # Empty/required
    ok, result = validate_postal_code_prefix("", is_required=True)
    if ok:
        print("FAIL: Expected required empty to be invalid")
        failures += 1
    else:
        print("PASS: empty required input rejected")

    # Empty/optional
    ok, result = validate_postal_code_prefix("", is_required=False)
    if not ok:
        print(f"FAIL: Expected optional empty to be valid but got '{result}'")
        failures += 1
    else:
        print("PASS: empty optional input allowed")

    # Max length enforcement
    ok, result = validate_postal_code_prefix("ABCD")
    if ok:
        print("FAIL: Expected 4-char input to be rejected")
        failures += 1
    else:
        print("PASS: 4-char input rejected")

    print(f"\n{'='*40}")
    if failures == 0:
        print("ALL TESTS PASSED")
    else:
        print(f"{failures} TEST(S) FAILED")
        sys.exit(1)


if __name__ == "__main__":
    run_tests()
