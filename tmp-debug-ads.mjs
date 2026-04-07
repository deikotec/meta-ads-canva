import fetch from 'node-fetch';

const ACCESS_TOKEN = 'EAAGQ8d27pUkBQ0iOdZAu2rTHyb1lLQqU9dZAHeXaFjghTmsZBNTiDwyAZBtqqPtOvF1bUnNzwIFEFriawJpLFEzTBUIBX80i3DgOraJqY2ZCLZBZBhUU1hS57oRq6CQmWMg9zjCq7Y9ZBTgIi4J1E5tBQiXPQ8dKjsU6rLEJISLFI1NmdJz5lJLUEsGMUHRM9r3XKcglX38OrBDwUaIYsD7DLgUZC';

async function run() {
  const meRes = await fetch(`https://graph.facebook.com/v20.0/me/adaccounts?access_token=${ACCESS_TOKEN}&fields=id,name`);
  const accountsData = await meRes.json();
  if (!accountsData.data || accountsData.data.length === 0) {
      console.log('No ad accounts found', accountsData);
      return;
  }
  const accountId = accountsData.data[0].id;
  console.log(`Using account ID: ${accountId}`);

  const url = `https://graph.facebook.com/v20.0/${accountId}/ads?fields=id,name,creative{asset_feed_spec,object_story_spec}&limit=10&access_token=${ACCESS_TOKEN}`;
  
  const res = await fetch(url);
  const data = await res.json();
  
  if (data.data) {
    const flexibleAds = data.data.filter(ad => ad.creative && ad.creative.asset_feed_spec);
    console.log(`Found ${flexibleAds.length} flexible ads out of ${data.data.length}`);
    if (flexibleAds.length > 0) {
      console.log('Sample asset_feed_spec images:');
      console.dir(flexibleAds[0].creative.asset_feed_spec.images, { depth: null });
      console.log('Sample object_story_spec:');
      console.dir(flexibleAds[0].creative.object_story_spec, { depth: null });
    }
  } else {
    console.error(data);
  }
}

run();
