import pytest
from api.utils.survey_utils import (
    calculate_median,
    calculate_std_dev,
    calculate_quartiles,
    find_outliers,
    calculate_mode,
)


class TestCalculateMedian:
    def test_empty_list(self):
        assert calculate_median([]) == 0.0

    def test_single_element(self):
        assert calculate_median([5]) == 5.0

    def test_odd_number_of_elements(self):
        assert calculate_median([1, 3, 5]) == 3.0

    def test_even_number_of_elements(self):
        assert calculate_median([1, 2, 3, 4]) == 2.5

    def test_unsorted_input(self):
        assert calculate_median([5, 1, 3]) == 3.0


class TestCalculateStdDev:
    def test_empty_list(self):
        assert calculate_std_dev([], 0.0) == 0.0

    def test_single_element(self):
        assert calculate_std_dev([5], 5.0) == 0.0

    def test_standard_case(self):
        result = calculate_std_dev([2, 4], 3.0)
        assert result == 1.0

    def test_multiple_values(self):
        result = calculate_std_dev([1, 2, 3, 4, 5], 3.0)
        assert abs(result - 1.414) < 0.001


class TestCalculateQuartiles:
    def test_empty_list(self):
        assert calculate_quartiles([]) == (0.0, 0.0, 0.0)

    def test_single_element(self):
        assert calculate_quartiles([5]) == (5.0, 5.0, 5.0)

    def test_even_count(self):
        q1, q2, q3 = calculate_quartiles([1, 2, 3, 4, 5, 6])
        assert q1 == 2.0
        assert q2 == 3.5
        assert q3 == 5.0

    def test_odd_count(self):
        q1, q2, q3 = calculate_quartiles([1, 2, 3, 4, 5])
        assert q1 == 1.5
        assert q2 == 3.0
        assert q3 == 4.5


class TestFindOutliers:
    def test_no_outliers(self):
        arr = [1, 2, 3, 4, 5]
        assert find_outliers(arr, 2.0, 4.0, 2.0) == []

    def test_with_outliers(self):
        arr = [1, 2, 3, 4, 100]
        outliers = find_outliers(arr, 2.0, 4.0, 2.0)
        assert 100 in outliers
        assert 1 not in outliers

    def test_zero_iqr(self):
        assert find_outliers([1, 2, 3], 2.0, 2.0, 0.0) == []

    def test_low_outliers(self):
        arr = [-100, 2, 3, 4, 5]
        outliers = find_outliers(arr, 2.5, 4.5, 2.0)
        assert -100 in outliers


class TestCalculateMode:
    def test_empty_dict(self):
        assert calculate_mode({}) == []

    def test_single_mode(self):
        counts = {"a": 1, "b": 3, "c": 2}
        assert calculate_mode(counts) == ["b"]

    def test_multiple_modes(self):
        counts = {"a": 2, "b": 2, "c": 1}
        result = calculate_mode(counts)
        assert set(result) == {"a", "b"}

    def test_all_same_count(self):
        counts = {"a": 1, "b": 1, "c": 1}
        result = calculate_mode(counts)
        assert set(result) == {"a", "b", "c"}
