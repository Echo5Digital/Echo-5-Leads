# Foster Care Application - Quick Start Guide

## For Administrators

### Initial Setup (One-Time)

1. **Install dependencies:**
   ```powershell
   cd backend
   .\setup-foster-care.ps1
   ```

2. **Verify environment variables in `backend/.env`:**
   ```env
   MONGODB_URI=your_mongodb_connection
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@domain.com
   SMTP_PASS=your-app-password
   FRONTEND_URL=https://yourdomain.com
   ```

3. **Start the backend server:**
   ```bash
   cd backend
   npm run dev
   ```

4. **Start the frontend:**
   ```bash
   cd frontend
   npm run dev
   ```

5. **Access the form:**
   ```
   http://localhost:3000/foster-care-application
   ```

### Configuration

#### Update Notification Email Recipients

Run this in MongoDB or through the admin panel:
```javascript
db.tenants.updateOne(
  { name: /open.*arms/i },
  { 
    $set: { 
      'config.notificationEmails': [
        'amber.price@openarmsfostercare.com',
        'kamryn.bass@openarmsfostercare.com'
      ]
    }
  }
)
```

### Accessing Applications

#### Via Dashboard
1. Go to `/leads`
2. Filter by `Lead Type: Foster Care Application`
3. View details including application ID

#### Via Database
```javascript
// List all applications
db.foster_applications.find({}).sort({ submittedAt: -1 })

// Find specific application
db.foster_applications.findOne({ _id: ObjectId('...') })
```

#### Download PDF
```
GET /api/foster-care-application/{applicationId}/pdf
```

---

## For End Users (Applicants)

### How to Apply

1. **Visit the application page:**
   ```
   https://yourdomain.com/foster-care-application
   ```

2. **Fill out all sections:**
   - Personal Information
   - Contact Information
   - Employment Information
   - Spouse/Partner (if applicable)
   - Household Information
   - Personal References (3 required)
   - Background Information
   - Motivation and Experience
   - Emergency Contact
   - Electronic Signature

3. **Review and submit**

4. **Check your email:**
   - Confirmation email with PDF attached
   - Save the PDF for your records
   - Note your Application ID

### What Happens After Submission?

1. ✉️ You receive a confirmation email with your application PDF
2. 👀 Case worker team reviews your application (2-3 business days)
3. 📞 A caseworker contacts you to schedule an interview (within 5 business days)
4. 🏠 Background checks and home study are scheduled
5. ✅ Final approval process

### Need Help?

**Email:** amber.price@openarmsfostercare.com

---

## For Developers

### Key Files

**Frontend:**
- Form: `frontend/app/foster-care-application/page.js`
- Success page: `frontend/app/foster-care-application/success/page.js`

**Backend:**
- Submit handler: `backend/src/routes/foster-care-application.js`
- PDF retrieval: `backend/src/routes/foster-care-application-pdf.js`
- Routes config: `backend/index.js`

### Database Collections

1. **foster_applications** - Full application data + PDF metadata
2. **leads** - Lead entries for CRM tracking

### Testing

```bash
# Test form submission (from backend directory)
curl -X POST http://localhost:3001/api/foster-care-application \
  -H "Content-Type: application/json" \
  -d @test-application.json
```

### Customization

#### Change Form Fields
Edit `formData` state in `page.js`:
```javascript
const [formData, setFormData] = useState({
  firstName: '',
  // Add your custom fields here
  customField: '',
  // ...
});
```

#### Modify PDF Layout
Edit `generateApplicationPDF()` in `foster-care-application.js`:
```javascript
async function generateApplicationPDF(formData) {
  // Customize PDF generation
  addSection(doc, 'YOUR CUSTOM SECTION');
  addField(doc, 'Custom Field', formData.customField);
}
```

#### Update Email Templates
Edit email content in the submit handler:
```javascript
const applicantEmailBody = `Your custom email template`;
const adminEmailBody = `Your admin notification template`;
```

---

## Troubleshooting

### PDF Not Generating
- Check PDFKit is installed: `npm list pdfkit`
- Check upload directory exists: `backend/uploads/foster-applications/`
- Check file permissions on upload directory

### Email Not Sending
- Verify SMTP credentials in `.env`
- Check SMTP_HOST and SMTP_PORT are correct
- For Gmail: use App Password, not regular password
- Check spam folder

### Form Not Submitting
- Check backend is running on correct port
- Verify `NEXT_PUBLIC_API_URL` in frontend `.env`
- Check browser console for errors
- Verify MongoDB connection

### Can't Download PDF
- Check file exists: `ls backend/uploads/foster-applications/`
- Verify applicationId is valid ObjectId
- Check file permissions

---

## API Reference

### Submit Application
```
POST /api/foster-care-application
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  ...all form fields
}

Response:
{
  "success": true,
  "applicationId": "507f1f77bcf86cd799439011",
  "message": "Application submitted successfully",
  "pdfUrl": "/api/foster-care-application/507f1f77bcf86cd799439011/pdf"
}
```

### Download PDF
```
GET /api/foster-care-application/:id/pdf

Response: PDF file (application/pdf)
```

---

## Security Best Practices

1. **Always use HTTPS in production**
2. **Protect PDF download endpoint** (add authentication)
3. **Encrypt sensitive data** in database
4. **Regular backups** of application data
5. **Implement rate limiting** on submission endpoint
6. **Validate and sanitize** all user inputs
7. **Log all access** to sensitive data

---

## Production Deployment

### Pre-Deployment Checklist
- [ ] Environment variables configured
- [ ] Database connection tested
- [ ] Email sending tested
- [ ] PDF generation tested
- [ ] HTTPS enabled
- [ ] CORS configured for production domain
- [ ] File storage configured (S3/Azure recommended)
- [ ] Monitoring and alerts set up
- [ ] Backup strategy in place

### Deploy Backend
```bash
# Vercel
vercel --prod

# Or Railway
railway up
```

### Deploy Frontend
```bash
# Vercel
cd frontend
vercel --prod
```

### Post-Deployment Testing
1. Submit test application
2. Verify email received
3. Download PDF via URL
4. Check database entries
5. Test on mobile device

---

**Version:** 1.0  
**Last Updated:** January 2026  
**Status:** Production Ready ✅
