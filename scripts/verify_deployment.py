import sys
import time
import requests

BACKEND_URL = "https://liminal-production-a580.up.railway.app"

def check_backend():
    print(f"Checking Backend at: {BACKEND_URL}")
    try:
        # Check Root (Health)
        resp = requests.get(f"{BACKEND_URL}/")
        print(f"ROOT [/]: Status {resp.status_code}")
        if resp.status_code != 200:
            print(f"❌ Root endpoint failed: {resp.text}")
            return False
        
        # Check Docs (Swagger)
        resp = requests.get(f"{BACKEND_URL}/docs")
        print(f"DOCS [/docs]: Status {resp.status_code}")
        if resp.status_code != 200:
            print(f"❌ Docs endpoint failed.")
            return False

        # Check CORS (Preflight)
        headers = {
            "Origin": "https://liminal-frontend-production.up.railway.app",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type"
        }
        resp = requests.options(f"{BACKEND_URL}/users", headers=headers)
        print(f"CORS PREFLIGHT [/users]: Status {resp.status_code}")
        
        allow_origin = resp.headers.get("access-control-allow-origin")
        print(f"CORS Header: {allow_origin}")
        
        if allow_origin != "https://liminal-frontend-production.up.railway.app":
             print(f"❌ CORS Header missing or incorrect. Got: {allow_origin}")
             return False

        print("✅ Backend appears healthy and CORS is configured!")
        return True

    except Exception as e:
        print(f"❌ Connection Failed: {e}")
        return False

if __name__ == "__main__":
    success = check_backend()
    sys.exit(0 if success else 1)
