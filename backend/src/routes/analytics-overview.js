// GET /api/analytics/overview - Get advanced analytics and reporting data
import { getDb, resolveTenantId } from '../lib/mongo.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const db = await getDb();
    const apiKey = req.headers['x-tenant-key'] || req.headers['X-Tenant-Key'];
    const tenantId = await resolveTenantId(db, apiKey);
    if (!tenantId) return res.status(401).json({ error: 'Invalid API key' });

    const leadsCollection = db.collection('leads');
    const activitiesCollection = db.collection('activities');

    // Date ranges
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
    const ninetyDaysAgo = new Date(now.getTime() - (90 * 24 * 60 * 60 * 1000));

    // 1. Conversion Rates by Stage
    const allLeads = await leadsCollection.find({ tenantId }).toArray();
    const stageConversion = {};
    const stages = ['new', 'contacted', 'qualified', 'orientation', 'application', 'home_study', 'licensed'];
    
    for (let i = 0; i < stages.length - 1; i++) {
      const currentStage = stages[i];
      const nextStage = stages[i + 1];
      
      const atCurrentStage = allLeads.filter(l => {
        const stageIndex = stages.indexOf(l.stage);
        return stageIndex >= i;
      }).length;
      
      const reachedNextStage = allLeads.filter(l => {
        const stageIndex = stages.indexOf(l.stage);
        return stageIndex >= i + 1;
      }).length;
      
      stageConversion[`${currentStage}_to_${nextStage}`] = {
        count: atCurrentStage,
        converted: reachedNextStage,
        rate: atCurrentStage > 0 ? ((reachedNextStage / atCurrentStage) * 100).toFixed(1) : 0
      };
    }

    // 2. Source Attribution (First-Touch)
    const sourceAttribution = {};
    allLeads.forEach(lead => {
      const source = lead.source || 'unknown';
      if (!sourceAttribution[source]) {
        sourceAttribution[source] = {
          total: 0,
          licensed: 0,
          conversionRate: 0
        };
      }
      sourceAttribution[source].total++;
      if (lead.stage === 'licensed' || lead.stage === 'placement') {
        sourceAttribution[source].licensed++;
      }
    });

    // Calculate conversion rates
    Object.keys(sourceAttribution).forEach(source => {
      const data = sourceAttribution[source];
      data.conversionRate = data.total > 0 ? ((data.licensed / data.total) * 100).toFixed(1) : 0;
    });

    // 3. Multi-Touch Attribution (UTM Snapshots)
    const utmSnapshots = await activitiesCollection.find({
      tenantId,
      type: 'utm_snapshot'
    }).toArray();

    const utmChannels = {};
    utmSnapshots.forEach(activity => {
      const source = activity.content?.utm_source || activity.content?.gclid ? 'google' : activity.content?.fbclid ? 'facebook' : 'other';
      utmChannels[source] = (utmChannels[source] || 0) + 1;
    });

    // 4. Lead Velocity (Leads created per week over last 90 days)
    const leadsByWeek = {};
    const weeksAgo90 = Math.floor((now - ninetyDaysAgo) / (7 * 24 * 60 * 60 * 1000));
    
    for (let i = 0; i < weeksAgo90; i++) {
      const weekStart = new Date(now.getTime() - ((i + 1) * 7 * 24 * 60 * 60 * 1000));
      const weekEnd = new Date(now.getTime() - (i * 7 * 24 * 60 * 60 * 1000));
      const weekKey = `Week ${weeksAgo90 - i}`;
      
      const count = allLeads.filter(l => {
        const createdAt = new Date(l.createdAt);
        return createdAt >= weekStart && createdAt < weekEnd;
      }).length;
      
      leadsByWeek[weekKey] = count;
    }

    // 5. Average Time in Each Stage
    const stageTimings = {};
    const stageActivities = await activitiesCollection.find({
      tenantId,
      type: 'status_change'
    }).toArray();

    // Group by leadId
    const leadStageChanges = {};
    stageActivities.forEach(activity => {
      if (!leadStageChanges[activity.leadId]) {
        leadStageChanges[activity.leadId] = [];
      }
      leadStageChanges[activity.leadId].push({
        stage: activity.stage,
        timestamp: new Date(activity.createdAt)
      });
    });

    // Calculate average time in each stage
    stages.forEach(stage => {
      const timesInStage = [];
      
      Object.values(leadStageChanges).forEach(changes => {
        changes.sort((a, b) => a.timestamp - b.timestamp);
        
        for (let i = 0; i < changes.length - 1; i++) {
          if (changes[i].stage === stage) {
            const timeInStage = (changes[i + 1].timestamp - changes[i].timestamp) / (1000 * 60 * 60 * 24); // days
            timesInStage.push(timeInStage);
          }
        }
      });
      
      stageTimings[stage] = timesInStage.length > 0
        ? (timesInStage.reduce((sum, t) => sum + t, 0) / timesInStage.length).toFixed(1)
        : 0;
    });

    // 6. Lead Quality Score (based on activity count and stage progression)
    const leadQuality = {
      hot: 0,  // Many activities, progressing quickly
      warm: 0, // Some activities, progressing normally
      cold: 0  // Few activities, not progressing
    };

    allLeads.forEach(lead => {
      const leadActivities = stageActivities.filter(a => a.leadId === lead._id.toString());
      const activityCount = leadActivities.length;
      const stageIndex = stages.indexOf(lead.stage);
      
      if (activityCount > 5 && stageIndex > 2) {
        leadQuality.hot++;
      } else if (activityCount > 2 || stageIndex > 0) {
        leadQuality.warm++;
      } else {
        leadQuality.cold++;
      }
    });

    // Response
    res.status(200).json({
      conversionRates: stageConversion,
      sourceAttribution,
      multiTouchAttribution: utmChannels,
      leadVelocity: leadsByWeek,
      averageStageTime: stageTimings,
      leadQuality,
      summary: {
        totalLeads: allLeads.length,
        leadsLast30Days: allLeads.filter(l => new Date(l.createdAt) >= thirtyDaysAgo).length,
        leadsLast90Days: allLeads.filter(l => new Date(l.createdAt) >= ninetyDaysAgo).length,
        totalActivities: stageActivities.length,
        utmTouchpoints: utmSnapshots.length
      }
    });
  } catch (err) {
    console.error('Error fetching analytics:', err);
    res.status(500).json({ error: 'Server error' });
  }
}
