from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import os

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

@app.route('/api/price', methods=['GET'])
def get_price():
    code = request.args.get('code')
    if not code:
        return jsonify({'error': 'Code parameter is required'}), 400

    url = "https://katalizatorychrzanow.pl/wp-admin/admin-ajax.php"
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'X-Requested-With': 'XMLHttpRequest',
        'Origin': 'https://katalizatorychrzanow.pl',
        'Referer': 'https://katalizatorychrzanow.pl/'
    }
    
    # Payload specific for the Polish site
    data = {
        'action': 'cur_price_table',
        'rows': '0',
        'offset': '5',
        'szukaj': code,
        'brand': 'all',
        'price': 'all',
        'typ': '0',
        'fueltype': '0',
        'sort': '0',
        'template': 'mobile',
        'tc_css': 'true',
        'tc_js': 'true',
        'tc_dane': 'top20',
        'tc_wyszukiwarka': 'true',
        'tc_lang': 'sk'
    }

    try:
        # print(f"Fetching price for code: {code}")
        response = requests.post(url, headers=headers, data=data)
        
        # We proxy the response data. 
        # The frontend will need to handle parsing if it's HTML, 
        # or we could parse it here with BeautifulSoup if we knew the structure.
        return jsonify({
            'success': True, 
            'status': response.status_code,
            'data': response.text 
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    import os
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)
