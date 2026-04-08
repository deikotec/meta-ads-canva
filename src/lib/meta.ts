const META_API_VERSION = "v25.0";
const META_BASE_URL = `https://graph.facebook.com/${META_API_VERSION}`;

export const MetaApi = {
  // 1. Generate Login URL
  getAuthUrl: (redirectUri: string, state: string) => {
    const clientId = process.env.META_CLIENT_ID;
    const scope = [
      "instagram_basic",
      "instagram_content_publish",
      "instagram_manage_insights",
      "pages_show_list",
      "pages_read_engagement",
      "public_profile",
      "business_management", 
      "ads_read",
      "ads_management"
    ].join(",");

    return `https://www.facebook.com/${META_API_VERSION}/dialog/oauth?client_id=${clientId}&redirect_uri=${redirectUri}&state=${state}&scope=${scope}&response_type=code&auth_type=reauthenticate`;
  },

  // 2. Exchange Code for Short-Lived Token
  exchangeCode: async (code: string, redirectUri: string) => {
    const clientId = process.env.META_CLIENT_ID;
    const clientSecret = process.env.META_CLIENT_SECRET;

    const url = `${META_BASE_URL}/oauth/access_token?client_id=${clientId}&redirect_uri=${redirectUri}&client_secret=${clientSecret}&code=${code}`;
    
    const res = await fetch(url);
    if (!res.ok) {
        const err = await res.json();
        console.error("Meta Token Exchange Error:", err);
        throw new Error(`Failed to exchange code for token: ${err.error?.message || JSON.stringify(err)}`);
    }
    return res.json();
  },

  // 3. Get Long-Lived Token (Required for offline access)
  getLongLivedToken: async (shortLivedToken: string) => {
    const clientId = process.env.META_CLIENT_ID;
    const clientSecret = process.env.META_CLIENT_SECRET;

    const url = `${META_BASE_URL}/oauth/access_token?grant_type=fb_exchange_token&client_id=${clientId}&client_secret=${clientSecret}&fb_exchange_token=${shortLivedToken}`;
    
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to get long-lived token");
    return res.json();
  },
// ...
  // 4. Get User Pages
  getPages: async (accessToken: string) => {
    const url = `${META_BASE_URL}/me/accounts?access_token=${accessToken}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch pages");
    return res.json();
  },

  getMe: async (accessToken: string) => {
      const res = await fetch(`${META_BASE_URL}/me?access_token=${accessToken}`);
      return res.json();
  },

  // 5. Get Instagram Business Account ID from Page
  getInstagramAccount: async (pageId: string, accessToken: string) => {
    const url = `${META_BASE_URL}/${pageId}?fields=instagram_business_account&access_token=${accessToken}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch IG account");
    return res.json();
  },
  
  // 6. Get IG Details (Profile Info)
  getInstagramDetails: async (instagramId: string, accessToken: string) => {
     const fields = 'username,name,biography,profile_picture_url,followers_count,follows_count,media_count,website';
     const url = `${META_BASE_URL}/${instagramId}?fields=${fields}&access_token=${accessToken}`;
     const res = await fetch(url);
     const data = await res.json();
     if (!res.ok || data.error) {
       throw new Error(`Failed to fetch IG details: ${data.error?.message || "Unknown error"}`);
     }
     return data;
  },

  // 7. Create Media Container (IG)
  createMediaContainer: async (accessToken: string, igUserId: string, mediaUrl: string, caption: string, mediaType: 'IMAGE' | 'VIDEO' = 'IMAGE', coverUrl?: string, isCarouselItem: boolean = false, scheduledPublishTime?: number) => {
    const url = `${META_BASE_URL}/${igUserId}/media`;
    
    const params = new URLSearchParams({
      access_token: accessToken,
    });

    if (!isCarouselItem) {
        params.append('caption', caption);
    } else {
        params.append('is_carousel_item', 'true');
    }

    if (scheduledPublishTime) {
        params.append('published', 'false');
        params.append('scheduled_publish_time', scheduledPublishTime.toString());
    }
    
    if (mediaType === 'VIDEO') {
        params.append('media_type', 'REELS');
        params.append('video_url', mediaUrl);
        if(coverUrl) params.append('cover_url', coverUrl);
    } else {
        params.append('image_url', mediaUrl);
    }

    const res = await fetch(`${url}?${params.toString()}`, { method: 'POST' });
    if (!res.ok) {
        const err = await res.json();
        throw new Error(`Failed to create container: ${err.error?.message || 'Unknown error'}`);
    }
    return res.json();
  },

  // 8. Publish Media
  publishMedia: async (accessToken: string, igUserId: string, creationId: string) => {
    const url = `${META_BASE_URL}/${igUserId}/media_publish`;
    const params = new URLSearchParams({
       access_token: accessToken,
       creation_id: creationId
    });

    const res = await fetch(`${url}?${params.toString()}`, { method: 'POST' });
    if (!res.ok) {
         const err = await res.json();
         throw new Error(`Failed to publish media: ${err.error?.message || 'Unknown error'}`);
    }
    return res.json();
  },

  // 9. Get Container Status
  getContainerStatus: async (accessToken: string, containerId: string) => {
     const url = `${META_BASE_URL}/${containerId}?fields=status_code,status&access_token=${accessToken}`;
     const res = await fetch(url);
     return res.json();
  },

  // 10. Create Carousel Container
  createCarouselContainer: async (accessToken: string, igUserId: string, caption: string, children: string[], scheduledPublishTime?: number) => {
      const url = `${META_BASE_URL}/${igUserId}/media`;
      const params = new URLSearchParams({
          access_token: accessToken,
          caption: caption,
          media_type: 'CAROUSEL',
          children: children.join(',') // List of item container IDs
      });

      if (scheduledPublishTime) {
          params.append('published', 'false');
          params.append('scheduled_publish_time', scheduledPublishTime.toString());
      }
      
      const res = await fetch(`${url}?${params.toString()}`, { method: 'POST' });
      if (!res.ok) {
           const err = await res.json();
           throw new Error(`Failed to create carousel container: ${err.error?.message || 'Unknown error'}`);
      }
      return res.json();
  },
  // 11. Debug Permissions
  getPermissions: async (accessToken: string) => {
      const url = `${META_BASE_URL}/me/permissions?access_token=${accessToken}`;
      const res = await fetch(url);
      return res.json();
  },

  // 12. Get Ad Accounts
  getAdAccounts: async (accessToken: string) => {
    const url = `${META_BASE_URL}/me/adaccounts?fields=id,name,account_status,currency&access_token=${accessToken}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch Ad Accounts");
    return res.json();
  },

  // 13. Get Campaign Insights (with ROAS and conversion data)
  getCampaignInsights: async (adAccountId: string, accessToken: string, datePreset: string = 'last_30d') => {
    const fields = [
      'campaign_id',
      'campaign_name',
      'spend',
      'impressions',
      'clicks',
      'actions',
      'action_values',
      'purchase_roas',
      'cpc',
      'cpm',
      'reach',
      'cost_per_action_type',
      'objective',
    ].join(',');
    const timeFilter = datePreset.startsWith('{') ? `&time_range=${encodeURIComponent(datePreset)}` : `&date_preset=${datePreset}`;
    const url = `${META_BASE_URL}/${adAccountId}/insights?level=campaign&fields=${fields}${timeFilter}&access_token=${accessToken}`;
    const res = await fetch(url);
    if (!res.ok) {
      const err = await res.json();
      throw new Error(`Failed to fetch Campaign Insights: ${err.error?.message || JSON.stringify(err)}`);
    }
    return res.json();
  },

  // 14. Get Campaigns list (status, dates, objective)
  getCampaigns: async (adAccountId: string, accessToken: string, activeOnly: boolean = true) => {
    const fields = 'id,name,objective,status,start_time,stop_time';
    const statusFilter = activeOnly ? `&effective_status=['ACTIVE','IN_PROCESS']` : '';
    const url = `${META_BASE_URL}/${adAccountId}/campaigns?fields=${fields}${statusFilter}&limit=100&access_token=${accessToken}`;
    const res = await fetch(url);
    if (!res.ok) {
      const err = await res.json();
      throw new Error(`Failed to fetch Campaigns: ${err.error?.message || JSON.stringify(err)}`);
    }
    return res.json();
  },

  // 15. Get Campaign Daily Breakdown (for time-series charts)
  getCampaignDailyInsights: async (targetId: string, accessToken: string, datePreset: string = 'last_30d') => {
    const fields = 'campaign_id,spend,impressions,clicks,actions,action_values';
    const timeFilter = datePreset.startsWith('{') ? `&time_range=${encodeURIComponent(datePreset)}` : `&date_preset=${datePreset}`;
    const url = `${META_BASE_URL}/${targetId}/insights?level=campaign&fields=${fields}${timeFilter}&time_increment=1&access_token=${accessToken}`;
    const res = await fetch(url);
    if (!res.ok) {
      const err = await res.json();
      throw new Error(`Failed to fetch Daily Insights: ${err.error?.message || JSON.stringify(err)}`);
    }
    return res.json();
  },

  // 16. Get Ad Sets (metadata: status, budgets, optimization goal)
  getAdSets: async (targetId: string, accessToken: string, campaignIds?: string[]) => {
    const fields = 'id,name,campaign_id,status,daily_budget,lifetime_budget,optimization_goal,targeting';
    let filterStr = '';
    if (campaignIds && campaignIds.length > 0) {
        filterStr = `&filtering=[{"field":"campaign.id","operator":"IN","value":${JSON.stringify(campaignIds)}}]`;
    }
    const url = `${META_BASE_URL}/${targetId}/adsets?fields=${fields}${filterStr}&limit=100&access_token=${accessToken}`;
    const res = await fetch(url);
    if (!res.ok) {
      const err = await res.json();
      throw new Error(`Failed to fetch Ad Sets: ${err.error?.message || JSON.stringify(err)}`);
    }
    return res.json();
  },

  // 17. Get Ad Set Insights (metrics by adset level)
  getAdSetInsights: async (targetId: string, accessToken: string, datePreset: string = 'last_30d', campaignIds?: string[]) => {
    const fields = 'adset_id,adset_name,campaign_id,campaign_name,spend,impressions,clicks,actions,action_values,purchase_roas,cpc,cpm,reach,cost_per_action_type';
    let filterStr = '';
    if (campaignIds && campaignIds.length > 0) {
        filterStr = `&filtering=[{"field":"campaign.id","operator":"IN","value":${JSON.stringify(campaignIds)}}]`;
    }
    const timeFilter = datePreset.startsWith('{') ? `&time_range=${encodeURIComponent(datePreset)}` : `&date_preset=${datePreset}`;
    const url = `${META_BASE_URL}/${targetId}/insights?level=adset&fields=${fields}${timeFilter}${filterStr}&limit=100&access_token=${accessToken}`;
    const res = await fetch(url);
    if (!res.ok) {
      const err = await res.json();
      throw new Error(`Failed to fetch Ad Set Insights: ${err.error?.message || JSON.stringify(err)}`);
    }
    return res.json();
  },

  // 18. Get Ads (metadata: status, creative thumbnail)
  getAds: async (targetId: string, accessToken: string, campaignIds?: string[]) => {
    const fields = 'id,name,adset_id,campaign_id,status,creative{thumbnail_url,image_url,body,video_id,object_story_spec{link_data{picture,message,child_attachments{picture,video_id,description}},video_data{video_id,thumbnail_url,message}},asset_feed_spec{images{url,hash},videos{video_id,thumbnail_url},bodies{text}},instagram_permalink_url}';
    let filterStr = '';
    if (campaignIds && campaignIds.length > 0) {
        filterStr = `&filtering=[{"field":"campaign.id","operator":"IN","value":${JSON.stringify(campaignIds)}}]`;
    }
    // Limit to 50 to prevent "reduce amount of data" errors with heavy object_story_spec fields
    const url = `${META_BASE_URL}/${targetId}/ads?fields=${fields}${filterStr}&limit=50&access_token=${accessToken}`;
    const res = await fetch(url);
    if (!res.ok) {
      const err = await res.json();
      throw new Error(`Failed to fetch Ads: ${err.error?.message || JSON.stringify(err)}`);
    }
    return res.json();
  },

  // 19. Get Ad Preview (iframe representation of the ad)
  getAdPreview: async (adId: string, accessToken: string, adFormat: string = 'DESKTOP_FEED_STANDARD') => {
    const url = `${META_BASE_URL}/${adId}/previews?ad_format=${adFormat}&access_token=${accessToken}`;
    const res = await fetch(url);
    if (!res.ok) {
      const err = await res.json();
      throw new Error(`Failed to fetch Ad Preview: ${err.error?.message || JSON.stringify(err)}`);
    }
    return res.json();
  },

  // 19. Get Ad Insights (metrics by ad level)
  getAdInsights: async (targetId: string, accessToken: string, datePreset: string = 'last_30d', campaignIds?: string[]) => {
    const fields = 'ad_id,ad_name,adset_id,adset_name,campaign_id,spend,impressions,clicks,actions,action_values,purchase_roas,cpc,cpm,reach,cost_per_action_type';
    let filterStr = '';
    if (campaignIds && campaignIds.length > 0) {
        filterStr = `&filtering=[{"field":"campaign.id","operator":"IN","value":${JSON.stringify(campaignIds)}}]`;
    }
    const timeFilter = datePreset.startsWith('{') ? `&time_range=${encodeURIComponent(datePreset)}` : `&date_preset=${datePreset}`;
    const url = `${META_BASE_URL}/${targetId}/insights?level=ad&fields=${fields}${filterStr}${timeFilter}&limit=100&access_token=${accessToken}`;
    const res = await fetch(url);
    if (!res.ok) {
      const err = await res.json();
      throw new Error(`Failed to fetch Ad Insights: ${err.error?.message || JSON.stringify(err)}`);
    }
    return res.json();
  },

  // 20. Get Instagram Time-Series Insights (daily breakdown — reach, follower_count)
  getInstagramInsights: async (igUserId: string, accessToken: string, since?: number, until?: number) => {
    // These metrics use the default time_series format and return per-day values
    const metrics = 'reach,follower_count';
    const period = 'day';

    let url = `${META_BASE_URL}/${igUserId}/insights?metric=${metrics}&period=${period}&access_token=${accessToken}`;
    if (since) url += `&since=${since}`;
    if (until) url += `&until=${until}`;

    const res = await fetch(url);
    if (!res.ok) {
      const err = await res.json();
      throw new Error(`Failed to fetch IG Insights: ${err.error?.message || JSON.stringify(err)}`);
    }
    return res.json();
  },

  // 21. Get Instagram Total-Value Insights (aggregate totals for a period)
  // These metrics require metric_type=total_value and don't return day-by-day breakdowns
  getInstagramInsightsTotalValue: async (igUserId: string, accessToken: string, since?: number, until?: number) => {
    const metrics = 'views,profile_views,website_clicks,total_interactions,accounts_engaged';
    const period = 'day';

    let url = `${META_BASE_URL}/${igUserId}/insights?metric=${metrics}&period=${period}&metric_type=total_value&access_token=${accessToken}`;
    if (since) url += `&since=${since}`;
    if (until) url += `&until=${until}`;

    const res = await fetch(url);
    if (!res.ok) {
      const err = await res.json();
      throw new Error(`Failed to fetch IG Total-Value Insights: ${err.error?.message || JSON.stringify(err)}`);
    }
    return res.json();
  }
};
