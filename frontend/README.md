# Echo5 Leads FrontendThis is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).



Next.js frontend application for managing leads.## Getting Started



## FeaturesFirst, run the development server:



- View all leads with filtering and search```bash

- Lead detail pages with activity timelinenpm run dev

- Add activities (notes, calls, emails, SMS, status changes)# or

- Responsive design with Tailwind CSSyarn dev

- Real-time updates# or

pnpm dev

## Setup# or

bun dev

1. Install dependencies:```

```bash

npm installOpen [http://localhost:3000](http://localhost:3000) with your browser to see the result.

```

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

2. Copy `.env.local.example` to `.env.local`:

```bashThis project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

cp .env.local.example .env.local

```## Learn More



3. Configure environment variables in `.env.local`:To learn more about Next.js, take a look at the following resources:

```

NEXT_PUBLIC_API_URL=http://localhost:3001- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.

NEXT_PUBLIC_API_KEY=your_tenant_api_key- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

```

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

4. Start the development server:

```bash## Deploy on Vercel

npm run dev

```The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.



5. Open [http://localhost:3000](http://localhost:3000)Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.


## Environment Variables

- `NEXT_PUBLIC_API_URL`: Backend API URL (default: http://localhost:3001)
- `NEXT_PUBLIC_API_KEY`: Your tenant API key from the backend

## Deployment to Vercel

1. Push your code to GitHub

2. Go to [Vercel](https://vercel.com) and import your repository

3. Configure environment variables:
   - `NEXT_PUBLIC_API_URL`: Your backend URL (e.g., https://your-api.vercel.app)
   - `NEXT_PUBLIC_API_KEY`: Your tenant API key

4. Deploy!

## Project Structure

```
frontend/
├── app/
│   ├── layout.js          # Root layout
│   ├── page.js            # Home page (leads list)
│   ├── leads/
│   │   └── [id]/
│   │       └── page.js    # Lead detail page
│   └── globals.css
├── lib/
│   └── api.js            # API client
└── public/
```

## Features by Page

### Home Page (`/`)
- List all leads
- Filter by stage, source
- Search by name, email, phone
- Pagination
- Click to view lead details

### Lead Detail Page (`/leads/[id]`)
- View lead information
- See activity timeline
- Add new activities
- Change lead stage
- Add notes, calls, emails, SMS

## API Integration

The frontend uses the `leadsApi` client from `lib/api.js` to communicate with the backend:

- `getLeads(params)` - List leads with filters
- `getLead(id)` - Get single lead with activities
- `addActivity(leadId, data)` - Add activity to lead
- `ingestLead(data)` - Create new lead (for testing)

All requests automatically include the `X-Tenant-Key` header from environment variables.
