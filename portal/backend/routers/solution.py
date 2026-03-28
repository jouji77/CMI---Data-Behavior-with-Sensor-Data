"""
BWRS (Benedict-Webb-Rubin-Starling) Equation of State Calculator
for centrifugal compressor performance calculations.

Uses Starling constants for common natural gas components.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import math

router = APIRouter()

# ─────────────────────────────────────────────────────────────────────────────
# BWRS constants (Starling, 1973) for each component
# Order: A0, B0, C0, D0, E0, a, b, c, d, alpha, gamma
# Units: pressure in MPa, volume in m³/kmol, temperature in K
# ─────────────────────────────────────────────────────────────────────────────
BWRS_CONSTANTS = {
    #          A0        B0         C0          D0          E0         a        b         c         d       alpha    gamma
    "N2":  [0.1368848, 0.0267261, 0.0254326, 0.000254326, 0.0000126, 0.02328, 0.018338, 0.0040837, 0.000355, 0.000060, 0.0053],
    "CO2": [0.6735350, 0.0470452, 0.6544100, 0.006405900, 0.0006732, 0.08844, 0.039925, 0.0339820, 0.007025, 0.000875, 0.0140],
    "CH4": [0.1855527, 0.0338004, 0.0507339, 0.000560680, 0.0000427, 0.03380, 0.025320, 0.0071200, 0.000664, 0.000110, 0.0060],
    "C2H6": [0.6042400, 0.0600900, 0.2099860, 0.002600400, 0.0003789, 0.07488, 0.051020, 0.0249680, 0.003285, 0.000452, 0.0120],
    "C3H8": [1.0072100, 0.0766630, 0.3992200, 0.008170100, 0.0008730, 0.13460, 0.073520, 0.0460640, 0.009400, 0.001028, 0.0180],
    "nC4H10": [1.6530400, 0.1008800, 0.8313820, 0.014476200, 0.0017563, 0.24040, 0.106080, 0.1017800, 0.017576, 0.002150, 0.0250],
    "iC4H10": [1.5395700, 0.0999000, 0.7573800, 0.012680800, 0.0016590, 0.22180, 0.101060, 0.0896800, 0.015880, 0.002040, 0.0240],
}

# Molecular weights (g/mol)
MW = {
    "N2": 28.014,
    "CO2": 44.010,
    "CH4": 16.043,
    "C2H6": 30.070,
    "C3H8": 44.097,
    "nC4H10": 58.124,
    "iC4H10": 58.124,
}

# Ideal gas Cp at ~300K (J/mol/K) for Cp/Cv ratio approximation
CP_IDEAL = {
    "N2": 29.1,
    "CO2": 37.1,
    "CH4": 35.7,
    "C2H6": 52.5,
    "C3H8": 73.6,
    "nC4H10": 97.5,
    "iC4H10": 96.8,
}

R = 8.314472  # J/(mol·K) = kJ/(kmol·K) * 1000


def mix_constants(composition: dict) -> dict:
    """Mixing rules for BWRS constants."""
    comps = list(BWRS_CONSTANTS.keys())
    yi = {c: composition.get(c, 0.0) for c in comps}

    def linear(key_idx):
        return sum(yi[c] * BWRS_CONSTANTS[c][key_idx] for c in comps)

    def sqrt_mix(key_idx):
        total = 0.0
        for ci in comps:
            for cj in comps:
                total += yi[ci] * yi[cj] * math.sqrt(BWRS_CONSTANTS[ci][key_idx] * BWRS_CONSTANTS[cj][key_idx])
        return total

    def cbrt_mix(key_idx):
        total = 0.0
        for ci in comps:
            for cj in comps:
                total += yi[ci] * yi[cj] * (BWRS_CONSTANTS[ci][key_idx] ** (1/3) + BWRS_CONSTANTS[cj][key_idx] ** (1/3)) ** 3 / 8
        return total

    # Mixing rules per Starling
    B0 = linear(1)
    A0 = sqrt_mix(0)
    C0 = sqrt_mix(2)
    D0 = sqrt_mix(3)
    E0 = sqrt_mix(4)
    a = cbrt_mix(5)
    b = cbrt_mix(6)
    c = cbrt_mix(7)
    d = cbrt_mix(8)
    alpha = cbrt_mix(9)
    gamma = sqrt_mix(10)

    # Molecular weight
    mw = sum(yi[c] * MW[c] for c in comps)

    # Cp/Cv approximation
    cp_mix = sum(yi[c] * CP_IDEAL[c] for c in comps)
    cv_mix = cp_mix - R
    k = cp_mix / cv_mix if cv_mix > 0 else 1.3

    return {
        "A0": A0, "B0": B0, "C0": C0, "D0": D0, "E0": E0,
        "a": a, "b": b, "c": c, "d": d, "alpha": alpha, "gamma": gamma,
        "mw": mw, "k": k,
    }


def bwrs_pressure(rho_mol: float, T: float, consts: dict) -> float:
    """
    Calculate pressure (MPa) given molar density (kmol/m³) and temperature (K).
    BWRS EOS: P = rho*R*T + (B0*R*T - A0 - C0/T² + D0/T³ - E0/T⁴)*rho²
                   + (b*R*T - a - d/T)*rho³ + alpha*(a + d/T)*rho⁶
                   + c*rho³/T²*(1 + gamma*rho²)*exp(-gamma*rho²)
    R in MPa·m³/(kmol·K) = 8.314472e-3
    """
    Rg = 8.314472e-3  # MPa·m³/(kmol·K)
    B0 = consts["B0"]; A0 = consts["A0"]; C0 = consts["C0"]
    D0 = consts["D0"]; E0 = consts["E0"]
    a = consts["a"]; b = consts["b"]; c = consts["c"]
    d = consts["d"]; alpha = consts["alpha"]; gamma = consts["gamma"]

    rho2 = rho_mol ** 2
    rho3 = rho_mol ** 3
    rho6 = rho_mol ** 6
    T2 = T ** 2; T3 = T ** 3; T4 = T ** 4

    P = (rho_mol * Rg * T
         + (B0 * Rg * T - A0 - C0 / T2 + D0 / T3 - E0 / T4) * rho2
         + (b * Rg * T - a - d / T) * rho3
         + alpha * (a + d / T) * rho6
         + c * rho3 / T2 * (1 + gamma * rho2) * math.exp(-gamma * rho2))
    return P


def bwrs_z(P_mpa: float, T: float, consts: dict, z_init: float = 1.0) -> float:
    """
    Calculate compressibility factor Z using BWRS EOS by Newton-Raphson iteration.
    """
    Rg = 8.314472e-3  # MPa·m³/(kmol·K)
    rho_init = P_mpa / (z_init * Rg * T)

    rho = rho_init
    for _ in range(200):
        P_calc = bwrs_pressure(rho, T, consts)
        # derivative dP/d(rho) numerically
        drho = rho * 1e-6 + 1e-12
        dP = (bwrs_pressure(rho + drho, T, consts) - P_calc) / drho
        if abs(dP) < 1e-20:
            break
        delta = (P_calc - P_mpa) / dP
        rho -= delta
        if rho < 1e-10:
            rho = 1e-10
        if abs(delta) < 1e-10:
            break

    Z = P_mpa / (rho * Rg * T)
    return Z, rho


def calc_enthalpy_departure(rho_mol: float, T: float, consts: dict) -> float:
    """
    Calculate enthalpy departure from ideal gas (kJ/kmol) using BWRS.
    H - H_ig = integral of [v - T*(dv/dT)_P] dP from 0 to P
    Evaluated analytically for BWRS.
    """
    Rg = 8.314472e-3  # MPa·m³/(kmol·K)
    B0 = consts["B0"]; C0 = consts["C0"]; D0 = consts["D0"]; E0 = consts["E0"]
    a = consts["a"]; c = consts["c"]; d = consts["d"]
    alpha = consts["alpha"]; gamma = consts["gamma"]

    T2 = T**2; T3 = T**3; T4 = T**4
    rho2 = rho_mol**2; rho3 = rho_mol**3; rho5 = rho_mol**5
    g = gamma * rho2
    exp_g = math.exp(-g)

    # H departure = [sum of terms] in MPa·m³/kmol → convert to kJ/kmol (* 1000)
    Hdep = (
        (2 * B0 * Rg * T - 2 * consts["A0"] - 4 * C0 / T2 + 5 * D0 / T3 - 6 * E0 / T4) * rho_mol
        + (2/3) * (2 * consts["b"] * Rg * T - 3 * a - 4 * d / T) * rho2
        + (5/3) * alpha * (2 * a + 4 * d / T) * rho5 / 5
        + c * rho2 / T2 * (3 / gamma - (3 / gamma + 3 * rho2 + g * rho2) * exp_g)
    )
    # Convert MPa·m³/kmol → kJ/kmol
    return Hdep * 1000.0


class BWRSInput(BaseModel):
    composition: dict  # {"CH4": 0.9, "C2H6": 0.05, ...} mole fractions summing to 1.0
    inlet_pressure_mpa: float
    inlet_temp_k: float
    outlet_pressure_mpa: float
    mass_flow_kgs: float
    shaft_power_kw: float


@router.post("/bwrs-calculate")
async def bwrs_calculate(req: BWRSInput):
    # Normalize composition
    comp = {k: v for k, v in req.composition.items() if k in BWRS_CONSTANTS}
    total = sum(comp.values())
    if total <= 0:
        raise HTTPException(status_code=400, detail="Invalid gas composition")
    comp = {k: v / total for k, v in comp.items()}

    # Get mixed constants
    consts = mix_constants(comp)
    mw = consts["mw"]  # g/mol = kg/kmol
    k = consts["k"]

    T1 = req.inlet_temp_k
    T2_guess = T1 * (req.outlet_pressure_mpa / req.inlet_pressure_mpa) ** ((k - 1) / k)

    # Inlet conditions
    try:
        Z1, rho1_mol = bwrs_z(req.inlet_pressure_mpa, T1, consts)
    except Exception:
        raise HTTPException(status_code=422, detail="BWRS convergence failed at inlet conditions")

    # Specific volume (m³/kg)
    # Rg in MPa·m³/(kmol·K); mw in kg/kmol
    Rg = 8.314472e-3  # MPa·m³/(kmol·K)
    v1_molar = Z1 * Rg * T1 / req.inlet_pressure_mpa  # m³/kmol
    v1 = v1_molar / mw  # m³/kg

    # Estimate outlet temperature for initial Z2 guess
    T2 = T2_guess

    # Compute outlet state at guessed T2
    try:
        Z2, rho2_mol = bwrs_z(req.outlet_pressure_mpa, T2, consts)
    except Exception:
        Z2 = 0.9
        rho2_mol = req.outlet_pressure_mpa / (0.9 * Rg * T2)
    v2_molar = Z2 * Rg * T2 / req.outlet_pressure_mpa
    v2 = v2_molar / mw  # m³/kg

    # Polytropic exponent from inlet/outlet states
    if abs(v1 - v2) > 1e-10 and abs(req.inlet_pressure_mpa - req.outlet_pressure_mpa) > 1e-10:
        n_poly = math.log(req.outlet_pressure_mpa / req.inlet_pressure_mpa) / math.log(v1 / v2)
    else:
        n_poly = k

    # Specific gas constant Rs = R/MW in kJ/(kg·K)
    # R = 8.314472 kJ/(kmol·K), MW in kg/kmol
    Rs = 8.314472 / mw  # kJ/(kg·K)

    # Polytropic head (kJ/kg)
    compression_ratio = req.outlet_pressure_mpa / req.inlet_pressure_mpa
    if abs(n_poly - 1.0) > 0.001:
        poly_head = (n_poly / (n_poly - 1.0)) * Z1 * Rs * T1 * (compression_ratio ** ((n_poly - 1) / n_poly) - 1.0)
    else:
        poly_head = Z1 * Rs * T1 * math.log(compression_ratio)

    # Polytropic efficiency
    actual_head_kj_kg = req.shaft_power_kw / req.mass_flow_kgs if req.mass_flow_kgs > 0 else poly_head
    poly_eff = poly_head / actual_head_kj_kg * 100.0 if actual_head_kj_kg > 0 else 0.0
    poly_eff = max(0.0, min(100.0, poly_eff))

    # Isentropic head (k-path)
    if abs(k - 1.0) > 0.001:
        isen_head = (k / (k - 1.0)) * Z1 * Rs * T1 * (compression_ratio ** ((k - 1) / k) - 1.0)
    else:
        isen_head = Z1 * Rs * T1 * math.log(compression_ratio)

    isen_eff = isen_head / actual_head_kj_kg * 100.0 if actual_head_kj_kg > 0 else 0.0
    isen_eff = max(0.0, min(100.0, isen_eff))

    # Outlet temperature estimate
    if abs(n_poly - 1.0) > 0.001:
        T2_calc = T1 * compression_ratio ** ((n_poly - 1.0) / n_poly)
    else:
        T2_calc = T1

    return {
        "polytropic_head_kJ_kg": round(poly_head, 2),
        "polytropic_efficiency_pct": round(poly_eff, 2),
        "isentropic_head_kJ_kg": round(isen_head, 2),
        "isentropic_efficiency_pct": round(isen_eff, 2),
        "compression_ratio": round(compression_ratio, 4),
        "outlet_temp_k": round(T2_calc, 2),
        "outlet_temp_c": round(T2_calc - 273.15, 2),
        "specific_volume_inlet": round(v1, 6),
        "specific_volume_outlet": round(v2, 6),
        "molecular_weight": round(mw, 4),
        "compressibility_z_inlet": round(Z1, 5),
        "compressibility_z_outlet": round(Z2, 5),
        "k_value": round(k, 4),
        "polytropic_exponent_n": round(n_poly, 4),
        "actual_head_kJ_kg": round(actual_head_kj_kg, 2),
        "composition_used": comp,
    }


@router.get("/gas-compositions")
async def get_gas_compositions():
    return [
        {
            "name_ja": "天然ガス（標準）",
            "name_en": "Natural Gas (Standard)",
            "composition": {"CH4": 0.90, "C2H6": 0.05, "C3H8": 0.02, "nC4H10": 0.005, "iC4H10": 0.005, "N2": 0.015, "CO2": 0.005},
        },
        {
            "name_ja": "天然ガス（リーン）",
            "name_en": "Natural Gas (Lean)",
            "composition": {"CH4": 0.96, "C2H6": 0.02, "C3H8": 0.005, "N2": 0.01, "CO2": 0.005},
        },
        {
            "name_ja": "天然ガス（リッチ）",
            "name_en": "Natural Gas (Rich)",
            "composition": {"CH4": 0.80, "C2H6": 0.08, "C3H8": 0.05, "nC4H10": 0.03, "iC4H10": 0.02, "N2": 0.01, "CO2": 0.01},
        },
        {
            "name_ja": "窒素",
            "name_en": "Nitrogen",
            "composition": {"N2": 1.0},
        },
        {
            "name_ja": "二酸化炭素",
            "name_en": "Carbon Dioxide",
            "composition": {"CO2": 1.0},
        },
        {
            "name_ja": "空気（近似）",
            "name_en": "Air (Approximate)",
            "composition": {"N2": 0.79, "CO2": 0.001, "CH4": 0.00, "C2H6": 0.00, "C3H8": 0.00, "nC4H10": 0.00, "iC4H10": 0.00},
        },
    ]
