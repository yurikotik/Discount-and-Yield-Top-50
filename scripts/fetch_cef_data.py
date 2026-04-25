import os
import json
import warnings
from datetime import datetime
from time import sleep
from getpass import getpass

import pandas as pd
import requests
import yfinance as yf
from bs4 import BeautifulSoup
from requests.adapters import HTTPAdapter, Retry

warnings.filterwarnings("ignore")

# CEFConnect API endpoints
CEFCONNECT_BASE_URL = "https://www.cefconnect.com"
CEFCONNECT_LOGIN_URL = f"{CEFCONNECT_BASE_URL}/api/v3/account/login"
CEFCONNECT_PORTFOLIO_URL = f"{CEFCONNECT_BASE_URL}/api/v3/portfolio"
CEFCONNECT_PORTFOLIO_HOLDINGS_URL = f"{CEFCONNECT_BASE_URL}/api/v3/portfolio/holdings"

# Pensionizer Top 50 Index - exact tickers from Barchart watchlist (04-25-2026)
UNIVERSE = [
    "BOE", "PEO", "EOD", "BCV", "BFZ", "BSTZ", "BGX", "DHF", "BWG", "RA",
    "CHW", "DSL", "ETJ", "EFR", "EVT", "ETW", "ETV", "FFA", "GDV", "GNT",
    "GAM", "HGLB", "PDT", "USA", "ASG", "CAF", "EDD", "DIAX", "JGH", "NMAI",
    "QQQX", "JRS", "BXMX", "NBXG", "PCQ", "PDX", "RMT", "RVT", "SABA", "HQH",
    "HQL", "TDF", "TY", "NCZ", "NIE", "ZTR", "IDE", "HYI", "WIW", "HIO"
]

# Pensionizer Top 50 Index - fund names from Barchart watchlist (04-25-2026)
TICKER_NAME_MAP = {
    "BOE": "Blackrock Global",
    "PEO": "Adams Natural Resources Fund Inc",
    "EOD": "Wells Fargo Global Dividend Opportunity",
    "BCV": "Bancroft Convertible Fund",
    "BFZ": "Blackrock California Muni Trust",
    "BSTZ": "Blackrock Science and Technology Trust II",
    "BGX": "Blackstone Long-Short Credit Income Fund",
    "DHF": "Dreyfus High Yield Strategies Fund",
    "BWG": "Legg Mason Bw Global Income",
    "RA": "Brookfield Real Assets Income Fund Inc",
    "CHW": "Calamos Gbl Dyn Inc",
    "DSL": "Doubleline Income Solutions Fund",
    "ETJ": "Eaton Vance Risk-Managed Diversified Equity",
    "EFR": "Eaton Vance Senior Floating-Rate Fund",
    "EVT": "Eaton Vance Tax Advantaged Dividend",
    "ETW": "Eaton Vance Corp",
    "ETV": "Eaton Vance Corp",
    "FFA": "FT Enhanced Equity Income Fund",
    "GDV": "Gabelli Dividend",
    "GNT": "Gabelli Natural Resources Gold",
    "GAM": "General American Investors",
    "HGLB": "Highland Global Allocation Fund",
    "PDT": "John Hancock Premium Dividend Fund",
    "USA": "Liberty All-Star Equity Fund",
    "ASG": "Liberty All-Star Growth Fund",
    "CAF": "MS China A Share Fund",
    "EDD": "MS Emerging Markets Domestic Debt Fund",
    "DIAX": "Nuveen Dow",
    "JGH": "Nuveen Global High Income Fund",
    "NMAI": "Nuveen Multi-Asset Income Fund",
    "QQQX": "Nuveen Nasdaq 100",
    "JRS": "Nuveen Real Estate Fund",
    "BXMX": "Nuveen Equity Premium",
    "NBXG": "Neuberger Next Gen Connectivity Fund Inc",
    "PCQ": "Pimco California Muni",
    "PDX": "Pimco Dynamic Income Strategy Fund",
    "RMT": "Royce Micro-Cap Trust",
    "RVT": "Royce Small-Cap Trust Inc",
    "SABA": "Saba Capital Income & Opportunities Fund II",
    "HQH": "Abrdn Healthcare Investors Fund",
    "HQL": "Abrdn Life Sciences Investors Fund",
    "TDF": "Templeton Dragon Fund",
    "TY": "Tri Continental Corp",
    "NCZ": "Virtus Convertible & Income Fund II",
    "NIE": "Virtus Equity & Convertible Income Fund",
    "ZTR": "Virtus Total Return Fund Inc",
    "IDE": "VOYA Infrastructure Industrial",
    "HYI": "Western Asset High Yield Opportunity Fund Inc",
    "WIW": "U.S Treasury Inflation Prot Secs Fd 2",
    "HIO": "Western Asset High",
}


def make_session():
    """Create a requests session with retry logic and browser-like headers."""
    s = requests.Session()
    retries = Retry(
        total=3,
        backoff_factor=0.5,
        status_forcelist=[429, 500, 502, 503, 504],
        allowed_methods=["GET", "POST"],
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
            ),
            "Accept": "application/json, text/plain, */*",
            "Accept-Language": "en-US,en;q=0.9",
            "Origin": CEFCONNECT_BASE_URL,
            "Referer": f"{CEFCONNECT_BASE_URL}/",
        }
    )
    return s


def cefconnect_login(session, email=None, password=None):
    """
    Authenticate with CEFConnect and return session with auth cookies.
    
    If email/password not provided, will prompt interactively or check env vars:
      - CEFCONNECT_EMAIL
      - CEFCONNECT_PASSWORD
    
    Returns:
        tuple: (success: bool, message: str)
    """
    # Get credentials from params, env vars, or prompt
    if email is None:
        email = os.environ.get("CEFCONNECT_EMAIL")
        if email is None:
            email = input("CEFConnect Email: ").strip()
    
    if password is None:
        password = os.environ.get("CEFCONNECT_PASSWORD")
        if password is None:
            password = getpass("CEFConnect Password: ")
    
    if not email or not password:
        return False, "Email and password are required"
    
    print(f"Logging in to CEFConnect as {email}...")
    
    # First, get the login page to obtain any CSRF tokens
    try:
        login_page = session.get(f"{CEFCONNECT_BASE_URL}/Account/Login", timeout=10)
        
        # Try to extract CSRF token if present
        soup = BeautifulSoup(login_page.text, "html.parser")
        csrf_token = None
        csrf_input = soup.find("input", {"name": "__RequestVerificationToken"})
        if csrf_input:
            csrf_token = csrf_input.get("value")
        
        # Prepare login payload
        login_data = {
            "email": email,
            "password": password,
            "rememberMe": True,
        }
        
        # Add CSRF token if found
        if csrf_token:
            login_data["__RequestVerificationToken"] = csrf_token
            session.headers["X-CSRF-TOKEN"] = csrf_token
        
        # Try API login first
        session.headers["Content-Type"] = "application/json"
        response = session.post(
            CEFCONNECT_LOGIN_URL,
            json=login_data,
            timeout=15,
        )
        
        if response.status_code == 200:
            try:
                data = response.json()
                if data.get("success") or data.get("isAuthenticated"):
                    print("  Login successful via API!")
                    return True, "Logged in successfully"
            except json.JSONDecodeError:
                pass
        
        # Fallback: try form-based login
        session.headers["Content-Type"] = "application/x-www-form-urlencoded"
        form_data = {
            "Email": email,
            "Password": password,
            "RememberMe": "true",
        }
        if csrf_token:
            form_data["__RequestVerificationToken"] = csrf_token
        
        response = session.post(
            f"{CEFCONNECT_BASE_URL}/Account/Login",
            data=form_data,
            timeout=15,
            allow_redirects=True,
        )
        
        # Check if login succeeded by looking for authenticated indicators
        if response.status_code == 200:
            if "logout" in response.text.lower() or "sign out" in response.text.lower():
                print("  Login successful via form!")
                return True, "Logged in successfully"
            elif "invalid" in response.text.lower() or "incorrect" in response.text.lower():
                return False, "Invalid email or password"
        
        # Check cookies for auth indicators
        auth_cookies = [c for c in session.cookies if "auth" in c.name.lower() or "session" in c.name.lower()]
        if auth_cookies:
            print("  Login appears successful (auth cookies present)")
            return True, "Logged in successfully"
        
        return False, f"Login failed with status {response.status_code}"
        
    except requests.exceptions.Timeout:
        return False, "Login request timed out"
    except requests.exceptions.RequestException as e:
        return False, f"Login request failed: {e}"


def fetch_cefconnect_portfolio(session):
    """
    Fetch portfolio holdings from CEFConnect (requires authentication).
    
    Returns:
        tuple: (holdings: list[dict], error: str or None)
    """
    print("Fetching CEFConnect portfolio...")
    
    try:
        # Try the portfolio API endpoint
        response = session.get(CEFCONNECT_PORTFOLIO_HOLDINGS_URL, timeout=15)
        
        if response.status_code == 401:
            return [], "Not authenticated - please login first"
        
        if response.status_code == 200:
            try:
                data = response.json()
                if isinstance(data, list):
                    print(f"  Found {len(data)} holdings in portfolio")
                    return data, None
                elif isinstance(data, dict) and "holdings" in data:
                    holdings = data["holdings"]
                    print(f"  Found {len(holdings)} holdings in portfolio")
                    return holdings, None
                elif isinstance(data, dict) and "funds" in data:
                    holdings = data["funds"]
                    print(f"  Found {len(holdings)} holdings in portfolio")
                    return holdings, None
            except json.JSONDecodeError:
                pass
        
        # Try scraping the portfolio page directly
        response = session.get(f"{CEFCONNECT_BASE_URL}/closed-end-funds-portfolio", timeout=15)
        
        if response.status_code == 200:
            soup = BeautifulSoup(response.text, "html.parser")
            
            # Look for portfolio table
            holdings = []
            table = soup.find("table", class_=lambda x: x and "portfolio" in x.lower()) or soup.find("table")
            
            if table:
                rows = table.find_all("tr")
                for row in rows[1:]:  # Skip header
                    cells = row.find_all(["td", "th"])
                    if len(cells) >= 2:
                        # Try to extract ticker and other data
                        ticker_cell = cells[0]
                        ticker_link = ticker_cell.find("a")
                        ticker = ticker_link.get_text(strip=True) if ticker_link else ticker_cell.get_text(strip=True)
                        
                        if ticker and len(ticker) <= 5:  # Valid ticker length
                            holding = {"ticker": ticker.upper()}
                            
                            # Extract additional columns if available
                            if len(cells) > 1:
                                holding["name"] = cells[1].get_text(strip=True) if len(cells) > 1 else ""
                            if len(cells) > 2:
                                holding["shares"] = cells[2].get_text(strip=True) if len(cells) > 2 else ""
                            if len(cells) > 3:
                                holding["price"] = cells[3].get_text(strip=True) if len(cells) > 3 else ""
                            if len(cells) > 4:
                                holding["nav"] = cells[4].get_text(strip=True) if len(cells) > 4 else ""
                            if len(cells) > 5:
                                holding["discount"] = cells[5].get_text(strip=True) if len(cells) > 5 else ""
                            
                            holdings.append(holding)
                
                if holdings:
                    print(f"  Scraped {len(holdings)} holdings from portfolio page")
                    return holdings, None
            
            # Check if redirected to login
            if "login" in response.url.lower():
                return [], "Session expired - please login again"
        
        return [], f"Could not fetch portfolio (status {response.status_code})"
        
    except requests.exceptions.Timeout:
        return [], "Portfolio request timed out"
    except requests.exceptions.RequestException as e:
        return [], f"Portfolio request failed: {e}"


def get_tickers_from_portfolio(holdings):
    """Extract ticker symbols from portfolio holdings."""
    tickers = []
    for h in holdings:
        ticker = h.get("ticker") or h.get("symbol") or h.get("Ticker") or h.get("Symbol")
        if ticker:
            tickers.append(ticker.upper().strip())
    return tickers


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


def fetch_cef_data(tickers, session=None):
    """Main function to fetch all CEF data and save to CSV."""
    if session is None:
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


def fetch_portfolio_data(email=None, password=None):
    """
    Authenticate with CEFConnect and fetch portfolio holdings with full data.
    
    Usage:
        # Interactive (prompts for credentials)
        fetch_portfolio_data()
        
        # With credentials
        fetch_portfolio_data("user@example.com", "password123")
        
        # With environment variables (CEFCONNECT_EMAIL, CEFCONNECT_PASSWORD)
        fetch_portfolio_data()
    
    Returns:
        DataFrame with portfolio holdings and enriched data
    """
    session = make_session()
    
    # Login to CEFConnect
    success, message = cefconnect_login(session, email, password)
    if not success:
        print(f"Login failed: {message}")
        return None
    
    # Fetch portfolio holdings
    holdings, error = fetch_cefconnect_portfolio(session)
    if error:
        print(f"Portfolio fetch failed: {error}")
        return None
    
    if not holdings:
        print("No holdings found in portfolio")
        return None
    
    # Extract tickers from portfolio
    tickers = get_tickers_from_portfolio(holdings)
    print(f"\nPortfolio tickers: {', '.join(tickers)}")
    
    # Fetch full data for portfolio tickers
    df = fetch_cef_data(tickers, session=session)
    
    # Merge with portfolio-specific data (shares, cost basis, etc.)
    portfolio_data = {}
    for h in holdings:
        ticker = (h.get("ticker") or h.get("symbol") or h.get("Ticker") or h.get("Symbol") or "").upper()
        if ticker:
            portfolio_data[ticker] = {
                "Shares": h.get("shares") or h.get("Shares") or h.get("quantity") or "",
                "CostBasis": h.get("costBasis") or h.get("cost_basis") or h.get("CostBasis") or "",
                "PurchaseDate": h.get("purchaseDate") or h.get("purchase_date") or h.get("PurchaseDate") or "",
            }
    
    # Add portfolio columns to DataFrame
    if portfolio_data:
        df["Shares"] = df["Symbol"].map(lambda x: portfolio_data.get(x, {}).get("Shares", ""))
        df["CostBasis"] = df["Symbol"].map(lambda x: portfolio_data.get(x, {}).get("CostBasis", ""))
        df["PurchaseDate"] = df["Symbol"].map(lambda x: portfolio_data.get(x, {}).get("PurchaseDate", ""))
    
    # Save portfolio-specific output
    data_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
    os.makedirs(data_dir, exist_ok=True)
    portfolio_path = os.path.join(data_dir, "cefconnect_portfolio.csv")
    df.to_csv(portfolio_path, index=False)
    print(f"\nSaved portfolio data to {portfolio_path}")
    
    return df


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Fetch CEF data from yfinance and CEFConnect")
    parser.add_argument(
        "--portfolio",
        action="store_true",
        help="Fetch holdings from your CEFConnect portfolio (requires login)"
    )
    parser.add_argument(
        "--email",
        type=str,
        help="CEFConnect email (or set CEFCONNECT_EMAIL env var)"
    )
    parser.add_argument(
        "--password",
        type=str,
        help="CEFConnect password (or set CEFCONNECT_PASSWORD env var)"
    )
    parser.add_argument(
        "--tickers",
        type=str,
        help="Comma-separated list of tickers to fetch (default: Pensionizer Top 50)"
    )
    
    args = parser.parse_args()
    
    if args.portfolio:
        # Fetch from CEFConnect portfolio
        fetch_portfolio_data(args.email, args.password)
    elif args.tickers:
        # Fetch specific tickers
        tickers = [t.strip().upper() for t in args.tickers.split(",")]
        fetch_cef_data(tickers)
    else:
        # Fetch default Pensionizer Top 50 universe
        fetch_cef_data(UNIVERSE)
