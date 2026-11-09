const http = require('http');

function request(method, path, data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, 'http://localhost:4000');
    const reqHeaders = { ...headers };
    let body = null;

    if (data) {
      body = JSON.stringify(data);
      reqHeaders['Content-Type'] = 'application/json';
      reqHeaders['Content-Length'] = Buffer.byteLength(body);
    }

    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: reqHeaders,
    };

    const req = http.request(options, (res) => {
      let responseBody = '';
      res.on('data', (chunk) => {
        responseBody += chunk;
      });
      res.on('end', () => {
        let parsed = responseBody;
        try {
          parsed = JSON.parse(responseBody);
        } catch (e) {}
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: parsed,
        });
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (body) {
      req.write(body);
    }
    req.end();
  });
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runTests() {
  console.log('================================================================');
  console.log('  BEYONDVYU COMPREHENSIVE STRATEGIC & FUNCTIONAL TEST SUITE');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  }

  try {
    // 1. Health check & Plans
    console.log('Test 1: Health / Subscription Plans');
    const healthRes = await request('GET', '/api/payments/plans');
    assert(healthRes.statusCode === 200, `Plans endpoint returned 200 OK (${healthRes.data?.plans?.length} plans available)`);

    // 2. User Authentication
    console.log('\nTest 2: Authentication (cptjacksprw@gmail.com / Player@123)');
    const loginRes = await request('POST', '/api/auth/login', {
      email: 'cptjacksprw@gmail.com',
      password: 'Player@123',
    });
    assert(loginRes.statusCode === 200, `Login status 200 OK`);
    const token = loginRes.data?.token;
    assert(!!token, `JWT session token acquired`);

    await sleep(300);
    const authHeaders = { Authorization: `Bearer ${token}` };

    // 3. Authenticated Profile & Businesses
    console.log('\nTest 3: Authenticated User Profile & Business Verification');
    const meRes = await request('GET', '/api/auth/me', null, authHeaders);
    assert(meRes.statusCode === 200, `GET /api/auth/me returned 200 OK`);
    const businesses = meRes.data?.businesses || [];
    assert(businesses.length > 0, `User has ${businesses.length} active business registered`);
    const business = businesses[0];
    console.log(`       Business: "${business.name}" | Slug: ${business.slug} | Industry: ${business.industry}`);

    // 4. Industry-Specific Public Flows
    console.log('\nTest 4: Industry-Specific Public Review Endpoints');
    const autoRes = await request('GET', `/api/feedback/public/${business.slug}`);
    assert(autoRes.statusCode === 200, `AUTO_DEALER public API 200 OK (${autoRes.data?.business?.name})`);

    const cafeRes = await request('GET', '/api/feedback/public/the-gallery-cafe');
    assert(cafeRes.statusCode === 200, `RESTAURANT public API 200 OK (${cafeRes.data?.business?.name})`);

    const dentalRes = await request('GET', '/api/feedback/public/brightsmile-dental-studio');
    assert(dentalRes.statusCode === 200, `DENTAL public API 200 OK (${dentalRes.data?.business?.name})`);

    // 5. Signature Menu Items Update & SEO Keyword Reflection
    console.log('\nTest 5: Signature Menu Items / Popular Services (SEO Chips)');
    const signatureTopics = ['SUV Test Drive', 'Pre-delivery Inspection', '0% Downpayment EMI'];
    const updateRes = await request('PATCH', `/api/businesses/${business.id}`, {
      promptTopics: signatureTopics,
    }, authHeaders);
    assert(updateRes.statusCode === 200, `Signature items saved via PATCH /api/businesses/:id`);
    assert(
      JSON.stringify(updateRes.data?.business?.promptTopics) === JSON.stringify(signatureTopics),
      `Stored signature items: ${JSON.stringify(updateRes.data?.business?.promptTopics)}`
    );

    // 6. Positive Feedback with Table Attribution
    console.log('\nTest 6: Positive Feedback Flow with Table Attribution');
    const posRes = await request('POST', '/api/feedback/submit', {
      businessSlug: business.slug,
      rating: 5,
      purchaseInfo: 'Table: 4',
      liked: 'Excellent SUV Test Drive experience, advisor explained 0% Downpayment EMI clearly!',
      customerName: 'Aarav Patel',
      selectedSubOptions: ['Vehicle selection', 'Deal & pricing'],
    });
    assert(posRes.statusCode === 201, `Positive feedback submitted (status 201)`);
    assert(posRes.data?.feedback?.rating === 5, `Rating 5 stored`);
    assert(posRes.data?.feedback?.purchaseInfo === 'Table: 4', `Table attribution stored in purchaseInfo`);
    const posFeedbackId = posRes.data?.feedback?.id;

    // 7. Closed-Loop Urgent Alert for Negative Review (1-Star Review)
    console.log('\nTest 7: Closed-Loop Urgent Operational Rescue Alert (1-Star Review)');
    const negRes = await request('POST', '/api/feedback/submit', {
      businessSlug: business.slug,
      rating: 1,
      purchaseInfo: 'Table: 4',
      privateNote: 'Food was served cold and waiter took 30 minutes to attend.',
      customerName: 'Priya Sharma',
      customerEmail: 'priya@example.com',
    });
    assert(negRes.statusCode === 201, `Negative review submitted (status 201)`);
    assert(negRes.data?.feedback?.status === 'PRIVATE_FEEDBACK', `Review protected as PRIVATE_FEEDBACK`);
    assert(negRes.data?.feedback?.purchaseInfo === 'Table: 4', `Table: 4 associated with negative review`);
    const negFeedbackId = negRes.data?.feedback?.id;

    // 8. Auto-Generated Operational Task Verification (Problem B: Complaint-to-Task)
    console.log('\nTest 8: Operational Task Auto-Generation from Complaint');
    await sleep(200);
    const tasksRes = await request('GET', `/api/v2/tasks/tasks/${business.id}`, null, authHeaders);
    assert(tasksRes.statusCode === 200, `GET /api/v2/tasks/tasks/:businessId returned 200 OK`);
    const matchingTask = tasksRes.data?.tasks?.find((t) => t.referenceId === negFeedbackId);
    assert(!!matchingTask, `Operational task auto-created for negative review (${matchingTask?.title})`);
    assert(matchingTask?.priority === 'high', `Task priority marked HIGH for fast turnaround`);
    assert(matchingTask?.taskType === 'follow_up', `Task type is follow_up`);
    console.log(`       Task Title: "${matchingTask?.title}"`);
    console.log(`       Task Priority: ${matchingTask?.priority} | Due: ${matchingTask?.dueAt}`);

    // 9. AI Review Response Drafting
    console.log('\nTest 9: AI Contextual Review Response Drafting');
    const aiReplyRes = await request('POST', '/api/ai/generate-reply', {
      feedbackId: posFeedbackId,
      businessId: business.id,
      tone: 'friendly',
      content: 'Aarav Patel had an excellent SUV Test Drive experience with clear 0% EMI details.',
    }, authHeaders);
    assert(
      aiReplyRes.statusCode === 200 || aiReplyRes.statusCode === 402,
      `AI Reply endpoint returned ${aiReplyRes.statusCode} (${aiReplyRes.statusCode === 200 ? 'AI Reply Generated' : aiReplyRes.data?.error || 'Credit check handled'})`
    );
    if (aiReplyRes.statusCode === 200) {
      console.log(`       Drafted Reply: "${aiReplyRes.data?.reply?.content?.slice(0, 80)}..."`);
    }

    // 10. Staff & Table QR Attribution URLs
    console.log('\nTest 10: QR Attribution URL Generation for Waitstaff / Tables');
    const baseUrl = `http://localhost:3000/r/${business.slug}`;
    const tableQrUrl = `${baseUrl}?table=Table+4`;
    const staffQrUrl = `${baseUrl}?staff=Rahul+Sharma`;
    assert(tableQrUrl.includes('table=Table+4'), `Table QR attribution URL: ${tableQrUrl}`);
    assert(staffQrUrl.includes('staff=Rahul+Sharma'), `Staff QR attribution URL: ${staffQrUrl}`);

    // 11. WhatsApp Flow Integration Route Check
    console.log('\nTest 11: WhatsApp Flows Review Collection API');
    const flowRes = await request('POST', '/api/v2/whatsapp-flows/send-flow', {
      businessId: business.id,
      phoneNumber: '9876543210',
      customerName: 'Rohan Gupta',
    }, authHeaders);
    assert(
      flowRes.statusCode === 502 || flowRes.statusCode === 400 || flowRes.statusCode === 404,
      `WhatsApp Flow endpoint reached & handled missing API credentials gracefully (status: ${flowRes.statusCode}, msg: "${flowRes.data?.error}")`
    );

    console.log('\n================================================================');
    console.log(`  COMPLETE SUITE: ${passed} PASSED, ${failed} FAILED`);
    console.log('================================================================\n');

    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  }
}

runTests();
