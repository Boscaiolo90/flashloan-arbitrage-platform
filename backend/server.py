from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime
import asyncio
import random

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

# Bot state
bot_state = {
    "active": False,
    "total_profits": 0.0,
    "successful_trades": 0,
    "failed_trades": 0,
    "active_opportunities": 0
}

# Models
class BotStatus(BaseModel):
    active: bool
    total_profits: float
    successful_trades: int
    failed_trades: int
    active_opportunities: int

class Opportunity(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    token_pair: str
    profit_eth: float
    profit_usd: float
    dex_from: str
    dex_to: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class Trade(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    token_pair: str
    profit_eth: float
    profit_usd: float
    gas_cost: float
    status: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class WalletInfo(BaseModel):
    address: str
    balance: float
    network: str = "base"

# Routes
@api_router.get("/")
async def root():
    return {"message": "FlashLoan Arbitrage API"}

@api_router.get("/bot/status", response_model=BotStatus)
async def get_bot_status():
    return BotStatus(**bot_state)

@api_router.post("/bot/start")
async def start_bot():
    bot_state["active"] = True
    bot_state["active_opportunities"] = random.randint(3, 12)
    return {"status": "started", "message": "Bot started successfully"}

@api_router.post("/bot/stop")
async def stop_bot():
    bot_state["active"] = False
    bot_state["active_opportunities"] = 0
    return {"status": "stopped", "message": "Bot stopped successfully"}

@api_router.get("/opportunities", response_model=List[Opportunity])
async def get_opportunities():
    if not bot_state["active"]:
        return []
    
    opportunities = []
    pairs = ["WETH/USDC", "WETH/DAI", "USDC/USDT", "WETH/WBTC"]
    dexes = ["Uniswap V3", "SushiSwap", "PancakeSwap"]
    
    for i in range(bot_state["active_opportunities"]):
        pair = random.choice(pairs)
        profit_eth = round(random.uniform(0.001, 0.05), 6)
        opportunities.append(Opportunity(
            token_pair=pair,
            profit_eth=profit_eth,
            profit_usd=round(profit_eth * 2500, 2),
            dex_from=random.choice(dexes),
            dex_to=random.choice([d for d in dexes if d != (opportunities[-1].dex_from if opportunities else None)])
        ))
    
    return opportunities

@api_router.get("/trades", response_model=List[Trade])
async def get_trades():
    trades = await db.trades.find().to_list(100)
    return [Trade(**trade) for trade in trades]

@api_router.post("/wallet/connect")
async def connect_wallet(wallet: WalletInfo):
    return {"status": "connected", "address": wallet.address}

@api_router.get("/prices/{token}")
async def get_token_price(token: str):
    base_prices = {"WETH": 2500.0, "USDC": 1.0, "DAI": 1.0, "WBTC": 45000.0, "USDT": 1.0}
    price = base_prices.get(token.upper(), 1.0)
    variation = random.uniform(-0.02, 0.02)
    final_price = price * (1 + variation)
    
    return {
        "token": token,
        "price": round(final_price, 2),
        "change_24h": round(variation * 100, 2)
    }

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
