"""Hand-rolled inference (no statsmodels in this sandbox)."""
import numpy as np, pandas as pd
from scipy import stats


# ---------------------------------------------------------------- OLS ----
class OLS:
    def __init__(self, y, X, names=None, robust=True):
        y = np.asarray(y, float).ravel()
        X = np.asarray(X, float)
        if X.ndim == 1: X = X[:, None]
        X = np.column_stack([np.ones(len(X)), X])
        names = ['const'] + list(names or [f'x{i}' for i in range(X.shape[1] - 1)])
        self.y, self.X, self.names = y, X, names
        n, k = X.shape
        XtXi = np.linalg.pinv(X.T @ X)
        self.b = XtXi @ X.T @ y
        self.fitted = X @ self.b
        self.resid = y - self.fitted
        self.n, self.k, self.df = n, k, n - k
        sse = self.resid @ self.resid
        sst = ((y - y.mean()) ** 2).sum()
        self.r2 = 1 - sse / sst
        self.adj_r2 = 1 - (1 - self.r2) * (n - 1) / (n - k)
        self.sigma2 = sse / self.df
        if robust:  # HC3
            h = np.einsum('ij,jk,ik->i', X, XtXi, X)
            S = (X * (self.resid / (1 - h))[:, None]).T @ (X * (self.resid / (1 - h))[:, None])
            V = XtXi @ S @ XtXi
        else:
            V = self.sigma2 * XtXi
        self.se = np.sqrt(np.diag(V))
        self.t = self.b / self.se
        self.p = 2 * stats.t.sf(np.abs(self.t), self.df)
        self.ci = np.column_stack([self.b - stats.t.ppf(.975, self.df) * self.se,
                                   self.b + stats.t.ppf(.975, self.df) * self.se])
        msr = (sst - sse) / (k - 1)
        self.f = msr / self.sigma2
        self.f_p = stats.f.sf(self.f, k - 1, self.df)
        sx = X.std(axis=0, ddof=1); sx[0] = 1
        self.beta = self.b * sx / y.std(ddof=1)
        self.beta[0] = np.nan

    def vif(self):
        out = {}
        for j in range(1, self.k):
            others = np.delete(self.X, j, axis=1)
            r2 = OLS(self.X[:, j], others[:, 1:], robust=False).r2
            out[self.names[j]] = 1 / max(1e-12, 1 - r2)
        return out

    def table(self):
        return pd.DataFrame({'term': self.names, 'b': self.b, 'se': self.se,
                             'beta': self.beta, 't': self.t, 'p': self.p,
                             'ci_lo': self.ci[:, 0], 'ci_hi': self.ci[:, 1]})

    def summary(self, title=''):
        t = self.table().copy()
        s = f'\n{title}\n  n={self.n}  R2={self.r2:.3f}  adjR2={self.adj_r2:.3f}  F({self.k-1},{self.df})={self.f:.2f}  p={self.f_p:.2e}\n'
        for _, r in t.iterrows():
            star = '***' if r.p < .001 else '**' if r.p < .01 else '*' if r.p < .05 else '' if r.p >= .1 else '.'
            bstr = '     ' if np.isnan(r.beta) else f'{r.beta:+.3f}'
            s += f"  {r.term:34s} b={r.b:+8.4f} se={r.se:6.4f} beta={bstr} t={r.t:+7.3f} p={r.p:.4f} {star}\n"
        return s


def f_change(y, X_small, X_big, names_s, names_b):
    m1, m2 = OLS(y, X_small, names_s), OLS(y, X_big, names_b)
    q = m2.k - m1.k
    f = ((m2.r2 - m1.r2) / q) / ((1 - m2.r2) / m2.df)
    return m1, m2, m2.r2 - m1.r2, f, stats.f.sf(f, q, m2.df)


# ----------------------------------------------------------- factoring ---
def varimax(L, tol=1e-6, itmax=200):
    L = L.copy(); p, k = L.shape
    if k < 2: return L, np.eye(k)
    R = np.eye(k); d = 0
    for _ in range(itmax):
        Lr = L @ R
        u, s, vt = np.linalg.svd(L.T @ (Lr ** 3 - Lr @ np.diag(np.diag(Lr.T @ Lr)) / p))
        R = u @ vt; dn = s.sum()
        if dn < d * (1 + tol): break
        d = dn
    return L @ R, R


def efa(df, nfac=2, rotate=True):
    """Principal-axis factoring with squared-multiple-correlation communalities."""
    d = df.dropna()
    R = np.corrcoef(d.values.T)
    h2 = 1 - 1 / np.diag(np.linalg.pinv(R))
    Rr = R.copy()
    for _ in range(60):
        np.fill_diagonal(Rr, h2)
        w, v = np.linalg.eigh(Rr)
        idx = np.argsort(w)[::-1][:nfac]
        L = v[:, idx] * np.sqrt(np.maximum(w[idx], 0))
        new = (L ** 2).sum(1)
        if np.max(np.abs(new - h2)) < 1e-6: h2 = new; break
        h2 = np.clip(new, 0, 1)
    if rotate and nfac > 1: L, _ = varimax(L)
    for j in range(L.shape[1]):
        if L[:, j].sum() < 0: L[:, j] *= -1
    w_full = np.linalg.eigvalsh(R)[::-1]
    return pd.DataFrame(L, index=d.columns,
                        columns=[f'F{i+1}' for i in range(nfac)]).assign(h2=(L ** 2).sum(1)), w_full


def parallel_analysis(df, n_iter=500, seed=7):
    d = df.dropna(); n, p = d.shape
    rng = np.random.default_rng(seed)
    real = np.linalg.eigvalsh(np.corrcoef(d.values.T))[::-1]
    sim = np.array([np.linalg.eigvalsh(np.corrcoef(rng.standard_normal((n, p)).T))[::-1]
                    for _ in range(n_iter)])
    return real, np.percentile(sim, 95, axis=0)


# ---------------------------------------------------------- inference ----
def corr_matrix(df):
    d = df.dropna(); c = d.corr(); n = len(d)
    t = c.values * np.sqrt((n - 2) / np.clip(1 - c.values ** 2, 1e-12, None))
    pv = np.array(2 * stats.t.sf(np.abs(t), n - 2), dtype=float)
    np.fill_diagonal(pv, 0.0)
    return c, pd.DataFrame(pv, index=c.index, columns=c.columns), n


def fdr(pvals):
    p = np.asarray(pvals, float); n = len(p); o = np.argsort(p)
    q = np.empty(n); run = 1.0
    for i in range(n - 1, -1, -1):
        run = min(run, p[o[i]] * n / (i + 1)); q[o[i]] = run
    return q


def welch(a, b):
    a, b = np.asarray(a, float), np.asarray(b, float)
    a, b = a[~np.isnan(a)], b[~np.isnan(b)]
    t, p = stats.ttest_ind(a, b, equal_var=False)
    sp = np.sqrt(((len(a) - 1) * a.var(ddof=1) + (len(b) - 1) * b.var(ddof=1)) / (len(a) + len(b) - 2))
    return dict(n1=len(a), n2=len(b), m1=a.mean(), m2=b.mean(), t=t, p=p,
                d=(a.mean() - b.mean()) / sp)


def anova(groups):
    gs = [np.asarray(g, float) for g in groups if len(g) > 1]
    f, p = stats.f_oneway(*gs)
    gm = np.concatenate(gs).mean()
    ssb = sum(len(g) * (g.mean() - gm) ** 2 for g in gs)
    sst = sum(((g - gm) ** 2).sum() for g in gs)
    k, n = len(gs), sum(len(g) for g in gs)
    eta2 = ssb / sst
    return dict(F=f, p=p, eta2=eta2, omega2=(ssb - (k - 1) * (sst - ssb) / (n - k)) / (sst + (sst - ssb) / (n - k)),
                k=k, n=n)


# ------------------------------------------------------- path / bootstrap -
def path_model(df, spec, n_boot=5000, seed=11):
    """spec: {outcome: [predictors]}. Returns coefficient table + bootstrap draws."""
    d = df.dropna(subset=sorted({v for k, vs in spec.items() for v in [k] + vs}))
    z = (d - d.mean()) / d.std(ddof=1)
    fits = {}
    for out, preds in spec.items():
        m = OLS(z[out].values, z[preds].values, preds)
        fits[out] = m
    rng = np.random.default_rng(seed)
    draws = {out: np.zeros((n_boot, len(p) + 1)) for out, p in spec.items()}
    idx_all = np.arange(len(z))
    for b in range(n_boot):
        i = rng.choice(idx_all, len(z), replace=True)
        zb = z.iloc[i]
        zb = (zb - zb.mean()) / zb.std(ddof=1)
        for out, preds in spec.items():
            draws[out][b] = OLS(zb[out].values, zb[preds].values, preds).b
    return fits, draws, z


def boot_ci(v, lo=2.5, hi=97.5):
    return np.percentile(v, lo), np.percentile(v, hi)
