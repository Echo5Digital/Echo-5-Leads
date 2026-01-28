# Signature Feature Implementation

## Overview
Digital signature feature has been implemented for the Foster Care Application form using `react-signature-canvas`. Users can draw signatures with mouse or touch, which are saved as base64 images and embedded into the generated PDF.

## Components

### 1. SignatureCanvas Component
**Location:** `frontend/app/components/SignatureCanvas.js`

**Features:**
- Draw signatures with mouse or touch input
- Clear button to reset signature
- Save button to confirm signature
- Exports signature as PNG data URL (base64)
- Responsive and customizable dimensions
- Visual confirmation when signature is saved

**Usage Example:**
```jsx
import SignatureCanvas from '../components/SignatureCanvas';

const [formData, setFormData] = useState({
  applicantSignature: '',
  applicantSignatureDate: ''
});

const signatureRef = useRef(null);

<SignatureCanvas
  ref={signatureRef}
  width={500}
  height={150}
  onSave={(dataURL) => {
    setFormData(prev => ({
      ...prev,
      applicantSignature: dataURL,
      applicantSignatureDate: new Date().toISOString().split('T')[0]
    }));
  }}
/>
```

### 2. Form Integration
**Location:** `frontend/app/foster-care-application/page.js`

**Updated Fields:**
- `applicantSignature` - Main application signature (Page 2)
- `applicant1ConsentSignature` - First applicant consent signature (Page 8-9)
- `applicant2ConsentSignature` - Second applicant consent signature (Page 8-9)
- `personNamedSignature` - Person Named in Request signature (Page 7 - Driver Records)
- `personMakingSignature` - Person Making Request signature (Page 7 - Driver Records)
- `applicant1Signature` - Resource Family Applicant 1 signature (Page 14)
- `applicant2Signature` - Resource Family Applicant 2 signature (Page 14)
- `adultMember1Signature` - Adult Household Member 1 signature (Page 14)
- `adultMember2Signature` - Adult Household Member 2 signature (Page 14)
- `adultMember3Signature` - Adult Household Member 3 signature (Page 14)
- `adultMember4Signature` - Adult Household Member 4 signature (Page 14)

**Total: 11 signature fields** converted from text inputs to digital signature canvas

All signature fields now:
- Use SignatureCanvas component instead of text input
- Automatically set date when signature is saved
- Display confirmation message when signature is captured
- Store signature as base64 data URL in form data

### 3. Backend PDF Generation
**Location:** `backend/src/routes/foster-care-application.js`

**New Function:** `embedSignatureImage()`
- Converts base64 data URL to image bytes
- Embeds PNG signature images into PDF using `pdf-lib`
- Positions signatures at specified coordinates
- Handles errors gracefully (continues without signature if embedding fails)

**Signature Positions in PDF:**
1. **Main Signature (Page 2):** x: 50, y: 150, width: 200, height: 50
2. **Consent 1 (Page 8):** x: 50, y: 200, width: 180, height: 45
3. **Consent 2 (Page 8):** x: 50, y: 100, width: 180, height: 45
4. **Person Named (Page 7):** x: 320, y: 650, width: 180, height: 40
5. **Person Making Request (Page 7):** x: 320, y: 520, width: 180, height: 40
6. **Applicant 1 (Page 14):** x: 50, y: 400, width: 200, height: 50
7. **Applicant 2 (Page 14):** x: 50, y: 330, width: 200, height: 50
8. **Adult Member 1-4 (Page 14):** x: 50, y: 260/190/120/50, width: 180, height: 40

> **Note:** These coordinates may need adjustment based on your actual PDF template. PDF coordinates start from the bottom-left corner.

## How It Works

### Frontend Flow:
1. User navigates to signature section in form
2. User draws signature on canvas using mouse/touch
3. User clicks "Save Signature" button
4. Signature is converted to PNG data URL
5. Data URL is stored in form state
6. Visual confirmation is displayed
7. Date is automatically set to current date

### Backend Flow:
1. Form data (including signature data URLs) is received via API
2. PDF template is loaded using `pdf-lib`
3. Form fields are filled with text data
4. Signature images are embedded at specified coordinates
5. PDF is saved and stored as base64 in database
6. PDF is sent as email attachment to applicant and admins

## Dependencies

### Frontend:
```json
{
  "react-signature-canvas": "^2.0.0" (or latest version)
}
```

### Backend:
```json
{
  "pdf-lib": "^1.17.1"
}
```

## Testing Checklist

- [ ] Signature canvas loads correctly on foster care form
- [ ] Mouse drawing works smoothly
- [ ] Touch drawing works on mobile devices
- [ ] Clear button removes signature
- [ ] Save button captures signature and shows confirmation
- [ ] Date is automatically populated
- [ ] Form submission includes signature data
- [ ] PDF is generated successfully
- [ ] Signatures appear in correct positions on PDF
- [ ] PDF is sent via email with embedded signatures
- [ ] Multiple signatures (applicant1, applicant2) work independently

## Customization Options

### Adjust Signature Canvas Size:
```jsx
<SignatureCanvas
  width={600}  // Change width
  height={200} // Change height
  penColor="blue" // Change pen color
/>
```

### Adjust PDF Signature Position:
Edit the coordinates in `backend/src/routes/foster-care-application.js`:
```javascript
await embedSignatureImage(pdfDoc, pageIndex, signatureDataURL, {
  x: 100,    // Horizontal position (from left)
  y: 300,    // Vertical position (from bottom)
  width: 250, // Signature width
  height: 60  // Signature height
});
```

## Troubleshooting

### Issue: Signature not showing in PDF
**Solution:** Check the page index and coordinates. Use a PDF viewer to determine correct positioning.

### Issue: Signature appears cut off
**Solution:** Increase the width/height values in `embedSignatureImage()` call.

### Issue: Signature quality is poor
**Solution:** Increase the canvas width/height in the SignatureCanvas component.

### Issue: Touch input not working
**Solution:** Ensure `touch-action: none` CSS is applied (handled by react-signature-canvas).

## Future Enhancements

Potential improvements:
- Add undo/redo functionality
- Allow typing name as alternative to drawing
- Add signature preview before final save
- Support for multiple signature styles (cursive fonts)
- Signature verification/comparison features
- Timestamp embedded in signature metadata

## Security Considerations

- Signatures are stored as base64 PNG data
- No external signature verification service is used
- Signatures are part of the application record
- PDF generation happens server-side for security
- Consider adding digital certificates for legal compliance (if needed)

## Support

For issues or questions about the signature feature:
1. Check browser console for errors
2. Verify signature data URL format in form data
3. Check backend logs for PDF generation errors
4. Test with different browsers/devices
