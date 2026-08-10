"""Recursive observed-variable path model (RAM formulation) with ML fit indices."""
import numpy as np, pandas as pd
from scipy import stats
from stats_lib import OLS


def fit_path(z, spec, exog):
    """z: standardised df. spec: {endog: [predictors]}. exog: list of exogenous vars.
    Returns paths, implied covariance and fit statistics."""
    order = exog + list(spec.keys())
    p = len(order)
    ix = {v: i for i, v in enumerate(order)}
    A = np.zeros((p, p))
    Psi = np.zeros((p, p))
    fits = {}
    for endo, preds in spec.items():
        mdl = OLS(z[endo].values, z[preds].values, preds, robust=False)
        fits[endo] = mdl
        for nm, b in zip(preds, mdl.b[1:]):
            A[ix[endo], ix[nm]] = b
        Psi[ix[endo], ix[endo]] = mdl.resid.var(ddof=1)
    Sx = np.cov(z[exog].values.T, ddof=1).reshape(len(exog), len(exog))
    Psi[:len(exog), :len(exog)] = Sx

    IA = np.linalg.inv(np.eye(p) - A)
    Sigma = IA @ Psi @ IA.T
    Ssample = np.cov(z[order].values.T, ddof=1)
    n = len(z)

    n_par = sum(len(v) for v in spec.values()) + len(spec) + len(exog) * (len(exog) + 1) // 2
    df = p * (p + 1) // 2 - n_par
    Si = np.linalg.inv(Sigma)
    F = np.log(np.linalg.det(Sigma)) - np.log(np.linalg.det(Ssample)) + np.trace(Ssample @ Si) - p
    chi2 = max(0.0, (n - 1) * F)
    pval = stats.chi2.sf(chi2, df) if df > 0 else np.nan

    # baseline (independence) model
    Sb = np.diag(np.diag(Ssample))
    Fb = np.log(np.linalg.det(Sb)) - np.log(np.linalg.det(Ssample)) + np.trace(Ssample @ np.linalg.inv(Sb)) - p
    chi2b = (n - 1) * Fb
    dfb = p * (p - 1) // 2

    cfi = 1 - max(chi2 - df, 0) / max(chi2b - dfb, chi2 - df, 1e-9)
    tli = ((chi2b / dfb) - (chi2 / df)) / ((chi2b / dfb) - 1) if df > 0 else np.nan
    rmsea = np.sqrt(max(chi2 - df, 0) / (df * (n - 1))) if df > 0 else np.nan
    r = np.tril(Ssample - Sigma, -1)
    d = np.diag(Ssample)
    srmr = np.sqrt((np.array([[r[i, j] / np.sqrt(d[i] * d[j]) for j in range(p)]
                              for i in range(p)]) ** 2)[np.tril_indices(p, -1)].mean())
    return dict(fits=fits, order=order, A=A, Sigma=Sigma, S=Ssample,
                chi2=chi2, df=df, p=pval, cfi=cfi, tli=tli, rmsea=rmsea, srmr=srmr,
                n=n, n_par=n_par,
                r2={k: v.r2 for k, v in fits.items()})


def bootstrap_effects(df, spec, exog, effects, n_boot=5000, seed=11):
    """effects: {label: [(endog, predictor), ...]} chains multiplied together."""
    cols = sorted(set(exog) | set(spec) | {v for vs in spec.values() for v in vs})
    d = df.dropna(subset=cols)
    rng = np.random.default_rng(seed)
    out = {k: np.zeros(n_boot) for k in effects}
    point = {}

    def paths(frame):
        z = (frame[cols] - frame[cols].mean()) / frame[cols].std(ddof=1)
        pa = {}
        for endo, preds in spec.items():
            mdl = OLS(z[endo].values, z[preds].values, preds, robust=False)
            for nm, b in zip(preds, mdl.b[1:]):
                pa[(endo, nm)] = b
        return pa

    P0 = paths(d)
    for k, chain in effects.items():
        point[k] = float(np.prod([P0[c] for c in chain]))
    idx = np.arange(len(d))
    for b in range(n_boot):
        P = paths(d.iloc[rng.choice(idx, len(d), replace=True)])
        for k, chain in effects.items():
            out[k][b] = np.prod([P[c] for c in chain])
    rows = []
    for k in effects:
        v = out[k]
        rows.append(dict(effect=k, estimate=point[k], boot_mean=v.mean(), se=v.std(ddof=1),
                         ci_lo=np.percentile(v, 2.5), ci_hi=np.percentile(v, 97.5),
                         p_boot=2 * min((v <= 0).mean(), (v >= 0).mean())))
    return pd.DataFrame(rows), P0
