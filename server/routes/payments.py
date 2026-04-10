import stripe
import os
from fastapi import APIRouter, Depends, HTTPException , Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel 
from utils.auth import get_current_user
from dotenv import load_dotenv

load_dotenv()

stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
router = APIRouter(prefix="/payment", tags=["payment"])

class CheckoutRequest(BaseModel):
    price_id: str
    origin: str

@router.post("/create-checkout-session")
async def create_checkout_session(
    request: CheckoutRequest, 
    user=Depends(get_current_user)
):
    frontend_url = request.origin
    try:
        session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=[{
                'price': request.price_id, 
                'quantity': 1,
            }],
            mode='subscription', 
            client_reference_id=str(user["user_id"]), 
            metadata={
                "user_id": str(user["user_id"]),
                "plan_type": "pro" if "price_1T3Z7bLIlOqwk7LfWJjRV28L" in request.price_id else "max"
            },
           success_url=f"{frontend_url}/success?session_id={{CHECKOUT_SESSION_ID}}",
           cancel_url=f"{frontend_url}/subscription/plans",
        )
        
        return JSONResponse(content={"url": session.url})
        
    except Exception as e:
        import traceback
        traceback.print_exc() 
        raise HTTPException(status_code=500, detail=str(e))
    

@router.post("/webhook")
async def stripe_webhook(request: Request):
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")
    
    endpoint_secret = os.getenv("STRIPE_WEBHOOK_SECRET")

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, endpoint_secret
        )
    except ValueError as e:
        return JSONResponse(status_code=400, content={"message": "Invalid payload"})
    except stripe.error.SignatureVerificationError as e:
        print("🚨 ALERT: Invalid Stripe Signature detected!")
        return JSONResponse(status_code=400, content={"message": "Invalid signature"})

    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        
        user_id = session.get("client_reference_id")
        
        plan_type = session.get("metadata", {}).get("plan_type", "pro")

        if user_id:
            print(f"💰 Payment confirmed! Upgrading user {user_id} to {plan_type.upper()} tier...")

            """
            db.users.update_one(
                {"_id": ObjectId(user_id)}, 
                {"$set": {
                    "plan": plan_type, 
                    "stripe_customer_id": stripe_customer_id,
                    "subscription_status": "active"
                }}
            )
            """
            print("✅ Database successfully updated.")

    return JSONResponse(content={"status": "success"})