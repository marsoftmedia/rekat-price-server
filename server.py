from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import os
import logging
from bs4 import BeautifulSoup
import re

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
# Enable CORS for all routes
CORS(app)

PORT = int(os.environ.get("PORT", 5000))

# Hardcoded crude conversion rate
USD_TO_EUR_RATE = 0.92

@app.route('/')
def health_check():
    return "Rekat Price Server is Running (AutoCatalystMarket)! v2.0"

@app.route('/api/price', methods=['GET'])
def get_price():
    code = request.args.get('code')
    if not code:
        return jsonify({"error": "No code provided"}), 400

    logger.info(f"Received request for code: {code}")

    # Use autocatalystmarket.com (EN version to get USD, then convert)
    url = "https://autocatalystmarket.com/en/products"
    params = {'q': code}
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5'
    }

    try:
        session = requests.Session()
        logger.info(f"Fetching: {url} with params {params}")
        response = session.get(url, params=params, headers=headers, timeout=20)
        
        if response.status_code != 200:
            logger.error(f"Target site returned status: {response.status_code}")
            return jsonify({"error": f"Target site returned {response.status_code}"}), 502

        # Parse HTML
        soup = BeautifulSoup(response.text, 'html.parser')
        
        products = []
        product_cards = soup.find_all(class_='prodcard')
        
        logger.info(f"Found {len(product_cards)} product cards")
        
        for card in product_cards:
            try:
                # Title
                title_elem = card.find(class_='title')
                title = title_elem.get_text(strip=True) if title_elem else "Unknown"
                
                # Image
                img_elem = card.find('img', class_='lazyload')
                img_src = ""
                if img_elem:
                    if img_elem.get('data-src'):
                        img_src = img_elem.get('data-src')
                    elif img_elem.get('src'):
                        img_src = img_elem.get('src')
                
                # Max Price extraction from "Max price for 6 months: 457 USD"
                price_text = ""
                price_usd = 0
                price_eur = 0
                
                max_price_div = card.find(class_='max-price')
                if max_price_div:
                    raw_price_text = max_price_div.get_text(strip=True)
                    match = re.search(r'(\d+)\s*USD', raw_price_text)
                    if match:
                        price_usd = int(match.group(1))
                        price_eur = round(price_usd * USD_TO_EUR_RATE)
                        price_text = f"{price_eur} €"
                    else:
                        price_text = "Price hidden"
                else:
                    price_text = "Login to view"

                href = title_elem['href'] if title_elem and title_elem.has_attr('href') else ""
                if href and not href.startswith('http'):
                    href = f"https://autocatalystmarket.com{href}"

                products.append({
                    "title": title,
                    "image": img_src,
                    "price_usd": price_usd,
                    "price_eur": price_eur,
                    "display_price": price_text,
                    "source_url": href
                })

            except Exception as e:
                logger.error(f"Error parsing card: {e}")
                continue

        if not products:
            return jsonify({
                "success": False, 
                "message": "Start searching",
                "products": []
            })
        
        return jsonify({
            "success": True,
            "count": len(products),
            "products": products
        })

    except requests.exceptions.Timeout:
        logger.error("Request timed out")
        return jsonify({"error": "Target site timed out"}), 504
    except Exception as e:
        logger.error(f"General error: {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=PORT)
