import math
from typing import List, Dict, Any, Tuple


def calculate_median(arr: List[float]) -> float:
    if not arr:
        return 0.0
    sorted_arr = sorted(arr)
    n = len(sorted_arr)
    if n % 2 == 0:
        return (sorted_arr[n // 2 - 1] + sorted_arr[n // 2]) / 2
    return sorted_arr[n // 2]


def calculate_std_dev(arr: List[float], mean: float) -> float:
    if len(arr) < 2:
        return 0.0
    variance = sum((x - mean) ** 2 for x in arr) / len(arr)
    return math.sqrt(variance)


def calculate_quartiles(arr: List[float]) -> Tuple[float, float, float]:
    if not arr:
        return (0.0, 0.0, 0.0)
    sorted_arr = sorted(arr)
    n = len(sorted_arr)
    q2 = calculate_median(sorted_arr)
    if n % 2 == 0:
        lower_half = sorted_arr[:n // 2]
        upper_half = sorted_arr[n // 2:]
    else:
        lower_half = sorted_arr[:n // 2]
        upper_half = sorted_arr[n // 2 + 1:]
    q1 = calculate_median(lower_half)
    q3 = calculate_median(upper_half)
    return (q1, q2, q3)


def find_outliers(arr: List[float], q1: float, q3: float, iqr: float) -> List[float]:
    if iqr <= 0:
        return []
    lower_bound = q1 - 1.5 * iqr
    upper_bound = q3 + 1.5 * iqr
    return [x for x in arr if x < lower_bound or x > upper_bound]


def calculate_mode(counts: Dict[Any, int]) -> List[Any]:
    if not counts:
        return []
    max_count = max(counts.values())
    return [k for k, v in counts.items() if v == max_count]
