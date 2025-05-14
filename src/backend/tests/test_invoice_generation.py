import pytest
import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from datetime import datetime, timedelta

from src.backend.db.models import PTClinic, PTBillingInvoice
from src.backend.utils.auth import create_access_token

# Test clinic fixture
@pytest_asyncio.fixture
async def test_clinic(test_db_session: AsyncSession):
    """Create a test clinic."""
    clinic = PTClinic(
        name="Test Clinic",
        area_ft2=5000.0,  # 5000 square feet
        sub_rate=0.05     # $0.05 per square foot
    )
    test_db_session.add(clinic)
    await test_db_session.commit()
    await test_db_session.refresh(clinic)
    return clinic

@pytest_asyncio.fixture
async def test_token():
    """Create a test token for authentication with admin privileges."""
    user_data = {
        "sub": "admin@example.com",
        "user_id": 1,
        "name": "Admin User",
        "is_admin": True  # Admin privileges for billing
    }
    return create_access_token(user_data)

@pytest.mark.asyncio
async def test_generate_invoice(test_app, test_clinic, test_token, test_db_session):
    """Test generating a monthly invoice for a clinic."""
    # Invoice generation data
    period_start = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0) - timedelta(months=1)
    period_end = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0) - timedelta(seconds=1)
    
    invoice_data = {
        "clinic_id": test_clinic.id,
        "period_start": period_start.isoformat(),
        "period_end": period_end.isoformat()
    }
    
    # Make request with admin authorization
    async with AsyncClient(app=test_app.app, base_url="http://test") as ac:
        response = await ac.post(
            "/api/billing/invoices/",
            json=invoice_data,
            headers={"Authorization": f"Bearer {test_token}"}
        )
    
    # Check response
    assert response.status_code == 200
    data = response.json()
    assert data["clinic_id"] == test_clinic.id
    assert data["period_start"] is not None
    assert data["period_end"] is not None
    assert data["billable_area"] == test_clinic.area_ft2
    
    # Calculate expected amount based on clinic area and rate
    expected_amount = test_clinic.area_ft2 * test_clinic.sub_rate
    assert data["amount_due"] == expected_amount
    assert data["paid"] is False  # New invoice should be unpaid
    
    # Verify in database
    result = await test_db_session.execute(
        select(PTBillingInvoice).filter(PTBillingInvoice.id == data["id"])
    )
    invoice = result.scalars().first()
    assert invoice is not None
    assert invoice.clinic_id == test_clinic.id
    assert invoice.amount_due == expected_amount

@pytest.mark.asyncio
async def test_list_clinic_invoices(test_app, test_clinic, test_token, test_db_session):
    """Test listing all invoices for a clinic."""
    # Create multiple invoices for the clinic
    for i in range(3):
        period_start = datetime.utcnow().replace(day=1) - timedelta(months=i+1)
        period_end = (period_start.replace(month=period_start.month+1) if period_start.month < 12 
                      else period_start.replace(year=period_start.year+1, month=1)) - timedelta(seconds=1)
        
        invoice = PTBillingInvoice(
            clinic_id=test_clinic.id,
            period_start=period_start,
            period_end=period_end,
            billable_area=test_clinic.area_ft2,
            amount_due=test_clinic.area_ft2 * test_clinic.sub_rate,
            paid=(i == 0)  # First invoice is paid
        )
        test_db_session.add(invoice)
    
    await test_db_session.commit()
    
    # Make request with authorization
    async with AsyncClient(app=test_app.app, base_url="http://test") as ac:
        response = await ac.get(
            f"/api/billing/invoices/?clinic_id={test_clinic.id}",
            headers={"Authorization": f"Bearer {test_token}"}
        )
    
    # Check response
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 3
    
    # Verify all invoices belong to the clinic
    for invoice in data:
        assert invoice["clinic_id"] == test_clinic.id
    
    # First invoice should be paid
    assert data[0]["paid"] is True

@pytest.mark.asyncio
async def test_mark_invoice_paid(test_app, test_clinic, test_token, test_db_session):
    """Test marking an invoice as paid."""
    # Create an unpaid invoice
    period_start = datetime.utcnow().replace(day=1) - timedelta(months=1)
    period_end = datetime.utcnow().replace(day=1) - timedelta(seconds=1)
    
    invoice = PTBillingInvoice(
        clinic_id=test_clinic.id,
        period_start=period_start,
        period_end=period_end,
        billable_area=test_clinic.area_ft2,
        amount_due=test_clinic.area_ft2 * test_clinic.sub_rate,
        paid=False
    )
    test_db_session.add(invoice)
    await test_db_session.commit()
    await test_db_session.refresh(invoice)
    
    # Payment data
    payment_data = {
        "paid": True
    }
    
    # Make request with admin authorization
    async with AsyncClient(app=test_app.app, base_url="http://test") as ac:
        response = await ac.put(
            f"/api/billing/invoices/{invoice.id}/payment",
            json=payment_data,
            headers={"Authorization": f"Bearer {test_token}"}
        )
    
    # Check response
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == invoice.id
    assert data["paid"] is True
    
    # Verify in database
    await test_db_session.refresh(invoice)
    assert invoice.paid is True

@pytest.mark.asyncio
async def test_get_clinic_billing_summary(test_app, test_clinic, test_token, test_db_session):
    """Test getting a billing summary for a clinic."""
    # Create invoices with different payment status
    for i in range(6):
        period_start = datetime.utcnow().replace(day=1) - timedelta(months=i+1)
        period_end = (period_start.replace(month=period_start.month+1) if period_start.month < 12 
                      else period_start.replace(year=period_start.year+1, month=1)) - timedelta(seconds=1)
        
        invoice = PTBillingInvoice(
            clinic_id=test_clinic.id,
            period_start=period_start,
            period_end=period_end,
            billable_area=test_clinic.area_ft2,
            amount_due=test_clinic.area_ft2 * test_clinic.sub_rate,
            paid=(i < 3)  # First 3 invoices are paid
        )
        test_db_session.add(invoice)
    
    await test_db_session.commit()
    
    # Make request with authorization
    async with AsyncClient(app=test_app.app, base_url="http://test") as ac:
        response = await ac.get(
            f"/api/billing/summary/{test_clinic.id}",
            headers={"Authorization": f"Bearer {test_token}"}
        )
    
    # Check response
    assert response.status_code == 200
    data = response.json()
    
    # Verify summary data
    assert data["clinic_id"] == test_clinic.id
    assert data["total_invoices"] == 6
    assert data["paid_invoices"] == 3
    assert data["unpaid_invoices"] == 3
    
    # Calculate expected totals
    invoice_amount = test_clinic.area_ft2 * test_clinic.sub_rate
    expected_paid = invoice_amount * 3
    expected_unpaid = invoice_amount * 3
    
    assert data["total_paid_amount"] == expected_paid
    assert data["total_unpaid_amount"] == expected_unpaid 