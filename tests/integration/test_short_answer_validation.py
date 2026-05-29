"""Tests for short_answer validation logic without requiring a running server."""
import re


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


class TestShortAnswerValidation:
    def test_valid_inputs(self):
        valid_cases = ["M5V", "A1B", "K0A", "K1A"]
        for v in valid_cases:
            ok, result = validate_postal_code_prefix(v)
            assert ok, f"Expected valid but got '{result}' for input '{v}'"
            assert result == v, f"Expected normalized '{v}' but got '{result}'"

    def test_normalization_from_lowercase(self):
        lower_cases = [("m5v", "M5V"), ("a1b", "A1B")]
        for inp, expected in lower_cases:
            ok, result = validate_postal_code_prefix(inp)
            assert ok, f"Expected valid but got '{result}' for lowercase input '{inp}'"
            assert result == expected, f"Expected '{expected}' but got '{result}' for input '{inp}'"

    def test_mixed_case(self):
        mixed_cases = [("M5v", "M5V"), ("a1B", "A1B")]
        for inp, expected in mixed_cases:
            ok, result = validate_postal_code_prefix(inp)
            assert ok, f"Expected valid but got '{result}' for mixed case input '{inp}'"
            assert result == expected, f"Expected '{expected}' but got '{result}' for input '{inp}'"

    def test_invalid_inputs(self):
        invalid_cases = [
            ("123", "format"),
            ("M55", "format"),
            ("M5VV", "length"),
            ("m*v", "format"),
            ("ab", "format"),
        ]
        for inp, reason in invalid_cases:
            ok, result = validate_postal_code_prefix(inp)
            assert not ok, f"Expected invalid ({reason}) but got valid for '{inp}'"

    def test_empty_required(self):
        ok, result = validate_postal_code_prefix("", is_required=True)
        assert not ok, "Expected required empty to be invalid"

    def test_empty_optional(self):
        ok, result = validate_postal_code_prefix("", is_required=False)
        assert ok, f"Expected optional empty to be valid but got '{result}'"

    def test_max_length_enforcement(self):
        ok, result = validate_postal_code_prefix("ABCD")
        assert not ok, "Expected 4-char input to be rejected"
