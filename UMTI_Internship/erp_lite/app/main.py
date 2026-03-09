from fastapi import FastAPI
from app.database import engine
from app.models import Base
from app.routers import auth, product, customer, supplier, order, csv  # Add csv here
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="ERP-Lite API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Create all database tables
print("Creating database tables...")
Base.metadata.create_all(bind=engine)
print("Database tables created successfully!")

# Include routers
app.include_router(auth.router)
app.include_router(product.router)
app.include_router(customer.router)
app.include_router(supplier.router)
app.include_router(order.router)
app.include_router(csv.router)  # Add this line

@app.get("/")
def root():
    return {"message": "Welcome to ERP-Lite API"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}