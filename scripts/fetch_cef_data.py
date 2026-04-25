import os
import warnings
from datetime import datetime
from time import sleep

import pandas as pd
import requests
import yfinance as yf
from bs4 import BeautifulSoup
from requests.adapters import HTTPAdapter, Retry

warnings.filterwarnings("ignore")

# Full 59-ticker CEF universe (Core 10 + 49 additional)
UNIVERSE = [
    # Core 10 from dashboard
    "UTF", "PDI", "RQI", "PTY", "GOF", "EOS", "STK", "UTG", "DNP",
    # Original watchlist (50 tickers, minus USA which is already in core conceptually)
    "BOE", "PEO", "EOD", "BCV", "BFZ", "BSTZ", "BGX", "DHF", "BWG", "RA",
    "CHW", "DSL", "ETJ", "EFR", "EVT", "ETW", "ETV", "FFA", "GDV", "GNT",
    "GAM", "HGLB", "PDT", "USA", "ASG", "CAF", "EDD", "DIAX", "JGH", "NMAI",
    "QQQX", "JRS", "BXMX", "NBXG", "PCQ", "PDX", "RMT", "RVT", "SABA", "HQH",
    "HQL", "TDF", "TY", "NCZ", "NIE", "ZTR", "IDE", "HYI", "WIW", "HIO"
]

# Optional: hard-coded names to avoid yfinance.info
TICKER_NAME_MAP = {
    # Core 10 funds
    "UTF": "Cohen & Steers Infrastructure Fund",
    "PDI": "PIMCO Dynamic Income Fund",
    "RQI": "Cohen & Steers Quality Income Realty Fund",
    "PTY": "PIMCO Corporate & Income Opportunity Fund",
    "GOF": "Guggenheim Strategic Opportunities Fund",
    "EOS": "Eaton Vance Enhanced Equity Income Fund II",
    "STK": "Columbia Seligman Premium Technology Growth Fund",
    "UTG": "Reaves Utility Income Fund",
    "DNP": "DNP Select Income Fund",
    # Additional funds
    "USA": "Liberty All-Star Equity Fund",
    "RVT": "Royce Value Trust",
    "RMT": "Royce Micro-Cap Trust",
    "BOE": "BlackRock Enhanced Global Dividend Trust",
    "PEO": "Adams Natural Resources Fund",
    "EOD": "Allspring Global Dividend Opportunity Fund",
    "BCV": "Bancroft Fund Ltd",
    "BFZ": "BlackRock California Municipal Income Trust",
    "BSTZ": "BlackRock Science and Technology Term Trust",
    "BGX": "Blackstone Long-Short Credit Income Fund",
    "DHF": "Dreyfus Municipal Bond Infrastructure Fund",
    "BWG": "BrandywineGlobal Global Income Opportunities Fund",
    "RA": "Brookfield Real Assets Income Fund",
    "CHW": "Calamos Global Dynamic Income Fund",
    "DSL": "DoubleLine Income Solutions Fund",
    "ETJ": "Eaton Vance Risk-Managed Diversified Equity Income Fund",
    "EFR": "Eaton Vance Senior Floating-Rate Fund",
    "EVT": "Eaton Vance Tax-Advantaged Dividend Income Fund",
    "ETW": "Eaton Vance Tax-Managed Global Buy-Write Opportunities Fund",
    "ETV": "Eaton Vance Tax-Managed Buy-Write Opportunities Fund",
    "FFA": "First Trust Enhanced Equity Income Fund",
    "GDV": "Gabelli Dividend & Income Trust",
    "GNT": "GAMCO Natural Resources, Gold & Income Trust",
    "GAM": "General American Investors Company",
    "HGLB": "Highland Global Allocation Fund",
    "PDT": "John Hancock Premium Dividend Fund",
    "ASG": "Liberty All-Star Growth Fund",
    "CAF": "Morgan Stanley China A Share Fund",
    "EDD": "Morgan Stanley Emerging Markets Debt Fund",
    "DIAX": "Nuveen Dow 30 Dynamic Overwrite Fund",
    "JGH": "Nuveen Global High Income Fund",
    "NMAI": "Nuveen Multi-Asset Income Fund",
    "QQQX": "Nuveen Nasdaq 100 Dynamic Overwrite Fund",
    "JRS": "Nuveen Real Asset Income and Growth Fund",
    "BXMX": "Nuveen S&P 500 Buy-Write Income Fund",
    "NBXG": "Neuberger Berman Next Generation Connectivity Fund",
    "PCQ": "PIMCO California Municipal Income Fund",
    "PDX": "PIMCO Dynamic Income Strategy Fund",
    "SABA": "Saba Capital Income & Opportunities Fund",
    "HQH": "Tekla Healthcare Investors",
    "HQL": "Tekla Life Sciences Investors",
    "TDF": "Templeton Dragon Fund",
    "TY": "Tri-Continental Corporation",
    "NCZ": "Virtus Convertible & Income Fund II",
    "NIE": "Virtus Equity & Convertible Income Fund",
    "ZTR": "Virtus Total Return Fund",
    "IDE": "Voya Infrastructure, Industrials and Materials Fund",
    "HYI": "Western Asset High Yield Defined Opportunity Fund",
    "WIW": "Western Asset/Claymore Inflation-Linked Opportunities & Income Fund",
    "HIO": "Western Asset High Income Opportunity Fund"
}


def make_session():
    """Create a requests session with retry logic and browser-like headers."""
    s = requests.Session()
    retries = Retry(
        total=3,
        backoff_factor=0.5,
        status_forcelist=[429, 500, 502, 503, 504],
        allowed_methods=["GET"],
    )
    adapter = HTTPAdapter(max_retries=retries)
    s.mount("https://", adapter)
    s.mount("http://", adapter)
    s.headers.update(
        {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/122.0 Safari/537.36"
            )
        }
    )
    return s


def fetch_prices_batch(tickers):
    """Batch pull OHLCV for last 5 days for all tickers."""
    print(f"Fetching yfinance data for {len(tickers)} CEFs (batch)...")
    df = yf.download(
        tickers=tickers,
        period="5d",
        group_by="ticker",
        auto_adjust=False,
        progress=False,
        threads=True,
    )

    rows = {}
    for t in tickers:
        try:
            # yfinance returns different shapes for single vs multi
            sub = df[t] if isinstance(df.columns, pd.MultiIndex) else df
            if len(sub) >= 2:
                last = sub.iloc[-1]
                prev = sub.iloc[-2]
                last_price = float(last["Close"])
                prev_price = float(prev["Close"])
                change = last_price - prev_price
                pct_change = (change / prev_price) * 100 if prev_price != 0 else 0.0
                row = {
                    "Last": round(last_price, 2),
                    "Change": round(change, 2),
                    "%Change": pct_change,
                    "Open": round(float(last["Open"]), 2),
                    "High": round(float(last["High"]), 2),
                    "Low": round(float(last["Low"]), 2),
                    "Volume": int(last["Volume"]),
                    "yf_ok": True,
                }
            else:
                row = {
                    "Last": 0.0,
                    "Change": 0.0,
                    "%Change": 0.0,
                    "Open": 0.0,
                    "High": 0.0,
                    "Low": 0.0,
                    "Volume": 0,
                    "yf_ok": False,
                }
        except Exception as e:
            print(f"    [yf ERROR] {t}: {e}")
            row = {
                "Last": 0.0,
                "Change": 0.0,
                "%Change": 0.0,
                "Open": 0.0,
                "High": 0.0,
                "Low": 0.0,
                "Volume": 0,
                "yf_ok": False,
            }
        rows[t] = row
    return rows


def parse_cefconnect_fields(soup):
    """Parse NAV, discount, and Z-score from CEFConnect page HTML."""
    nav = discount = z_score = ""
    
    # Try to find NAV value
    nav_elements = soup.find_all(string=lambda text: text and "NAV" in text if text else False)
    for elem in nav_elements:
        parent = elem.find_parent()
        if parent:
            sibling = parent.find_next_sibling()
            if sibling:
                text = sibling.get_text(strip=True)
                if "$" in text:
                    nav = text.replace("$", "").replace(",", "")
                    break
    
    # Try to find Discount/Premium value
    disc_elements = soup.find_all(string=lambda text: text and ("Discount" in text or "Premium" in text) if text else False)
    for elem in disc_elements:
        parent = elem.find_parent()
        if parent:
            sibling = parent.find_next_sibling()
            if sibling:
                text = sibling.get_text(strip=True)
                if "%" in text:
                    discount = text.replace("%", "")
                    break
    
    # Try to find Z-Score
    z_elements = soup.find_all(string=lambda text: text and "Z-Score" in text if text else False)
    for elem in z_elements:
        parent = elem.find_parent()
        if parent:
            sibling = parent.find_next_sibling()
            if sibling:
                z_score = sibling.get_text(strip=True)
                break
    
    return nav, discount, z_score


def fetch_cefconnect_for_ticker(session, ticker):
    """Fetch NAV, discount, and Z-score data from CEFConnect for a single ticker."""
    url = f"https://www.cefconnect.com/fund/{ticker}"
    try:
        r = session.get(url, timeout=8)
        if r.status_code != 200:
            print(f"    [cef HTTP] {ticker}: status {r.status_code}")
            return {"NAV": "", "Discount": "", "Z_Score": "", "cef_ok": False}
        soup = BeautifulSoup(r.text, "html.parser")
        nav, disc, z = parse_cefconnect_fields(soup)
        cef_ok = any([nav, disc, z])
        if not cef_ok:
            print(f"    [cef PARSE] {ticker}: no fields extracted")
        return {
            "NAV": nav,
            "Discount": disc,
            "Z_Score": z,
            "cef_ok": cef_ok,
        }
    except Exception as e:
        print(f"    [cef ERROR] {ticker}: {e}")
        return {"NAV": "", "Discount": "", "Z_Score": "", "cef_ok": False}


def fetch_cef_data(tickers):
    """Main function to fetch all CEF data and save to CSV."""
    session = make_session()
    price_map = fetch_prices_batch(tickers)

    rows = []
    today = datetime.now().strftime("%Y-%m-%d")

    print(f"Enriching with CEFConnect (NAV/Discount/Z-Score)...")
    for i, t in enumerate(tickers):
        print(f"  [{i+1}/{len(tickers)}] {t}")
        p = price_map.get(t, {})
        cef = fetch_cefconnect_for_ticker(session, t)
        sleep(0.5)  # polite delay between requests

        pct_change = p.get("%Change", 0.0)
        row = {
            "Symbol": t,
            "Name": TICKER_NAME_MAP.get(t, t),
            "Last": p.get("Last", 0.0),
            "Change": p.get("Change", 0.0),
            "%Change": f"{'+' if pct_change > 0 else ''}{pct_change:.2f}%",
            "Open": p.get("Open", 0.0),
            "High": p.get("High", 0.0),
            "Low": p.get("Low", 0.0),
            "Volume": p.get("Volume", 0),
            "Time": today,
            "NAV": cef["NAV"],
            "Discount": cef["Discount"],
            "Z_Score": cef["Z_Score"],
            "yf_ok": p.get("yf_ok", False),
            "cef_ok": cef["cef_ok"],
        }
        rows.append(row)

    df = pd.DataFrame(rows)
    
    # Save to data folder (relative to project root)
    data_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
    os.makedirs(data_dir, exist_ok=True)
    
    out_path = os.path.join(data_dir, "latest_watchlist.csv")
    df.to_csv(out_path, index=False)
    print(f"\nSaved {len(df)} records to {out_path}")

    # Optional: log failures
    log_path = os.path.join(data_dir, "latest_watchlist_log.csv")
    df[["Symbol", "yf_ok", "cef_ok"]].to_csv(log_path, index=False)
    print(f"Log written to {log_path}")
    
    return df


if __name__ == "__main__":
    fetch_cef_data(UNIVERSE)
