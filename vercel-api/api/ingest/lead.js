import { getDb, resolveTenantId, normPhone } from '../../src/lib/mongo.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const apiKey = req.headers['x-tenant-key'] || req.headers['X-Tenant-Key'];
    const db = await getDb();
    const tenantId = await resolveTenantId(db, typeof apiKey === 'string' ? apiKey : undefined);
    if (!tenantId) return res.status(401).json({ error: 'Invalid API key' });

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});

    const now = new Date();
    const firstName = body.first_name?.toString().trim() || undefined;
    const lastName  = body.last_name?.toString().trim() || undefined;
    const email     = body.email?.toString().trim().toLowerCase() || undefined;
    const phoneE164 = normPhone(body.phone);
    const city      = body.city?.toString().trim() || undefined;
    const campaignName = body.campaign_name?.toString().trim() || undefined;
    const providedSource = body.source?.toString().trim() || undefined;

    const utm = {};
    ['utm_source','utm_medium','utm_campaign','utm_term','utm_content','gclid','fbclid','referrer','form_id']
      .forEach(k => { if (body[k]) utm[k] = String(body[k]); });

    if (!email && !phoneE164) return res.status(400).json({ error: 'email or phone required' });

    const tenants = db.collection('tenants');
    const leads = db.collection('leads');
    const activities = db.collection('activities');

    const tenant = await tenants.findOne({ _id: tenantId });
    const spamKeywords = (tenant?.config?.spamKeywords || []).map(s => String(s).toLowerCase());
    const stageDefault = 'new';

    const existing = await leads.findOne({
      tenantId,
      $or: [
        ...(email ? [{ email }] : []),
        ...(phoneE164 ? [{ phoneE164 }] : []),
      ]
    });

    let sourceToSet;
    if (!existing) {
      if (providedSource) sourceToSet = providedSource;
      else if (utm.utm_source) sourceToSet = utm.utm_source;
      else sourceToSet = 'website';
    }

    const payloadStr = JSON.stringify(body).toLowerCase();
    const spamFlag = spamKeywords.some(kw => kw && payloadStr.includes(kw));

    let leadId;
    if (!existing) {
      const doc = {
        tenantId,
        firstName,
        lastName,
        email,
        phoneE164,
        city,
        source: sourceToSet,
        campaignName,
        stage: stageDefault,
        assignedUserId: null,
        office: null,
        spamFlag,
        createdAt: now,
        latestActivityAt: now,
        originalPayload: body,
      };
      const ins = await leads.insertOne(doc);
      leadId = ins.insertedId.toString();

      await activities.insertOne({
        tenantId,
        leadId,
        type: 'note',
        content: { title: 'Attribution v1', note: `source set to: ${doc.source}` },
        createdAt: now,
      });
    } else {
      leadId = existing._id.toString();
      const update = { $set: { firstName, lastName, city, campaignName } };
      if (email) update.$set.email = email;
      if (phoneE164) update.$set.phoneE164 = phoneE164;
      update.$set.spamFlag = spamFlag;
      await leads.updateOne({ _id: existing._id }, update);
    }

    if (Object.keys(utm).length > 0) {
      await activities.insertOne({ tenantId, leadId, type: 'utm_snapshot', content: utm, createdAt: now });
    }

    return res.status(200).json({ leadId });
  } catch (err) {
    return res.status(500).json({ error: 'internal_error', details: String(err?.message || err) });
  }
}
