import {getCliClient} from 'sanity/cli'

const client = getCliClient({apiVersion: '2026-09-20'})

type SeedDocument = Record<string, unknown> & {_type: string}

async function upsert(query: string, params: Record<string, string>, document: SeedDocument) {
  const existing = await client.fetch<{_id: string} | null>(query, params)

  if (existing?._id) {
    return client.patch(existing._id).set(document).commit()
  }

  return client.create(document)
}

const reference = (_ref: string, _key?: string) => ({
  _type: 'reference',
  _ref,
  ...(_key ? {_key} : {}),
})

const procedure = (key: string, steps: string[]) =>
  steps.map((text, index) => ({
    _type: 'block',
    _key: `${key}-${index + 1}`,
    style: 'normal',
    markDefs: [],
    children: [{_type: 'span', _key: `${key}-${index + 1}-text`, marks: [], text}],
  }))

async function seed() {
  const postgres = await upsert(
    '*[_type == "service" && name == $name][0]{_id}',
    {name: 'postgres'},
    {
      _type: 'service',
      name: 'postgres',
      description: 'Primary database for payment and checkout data.',
      owner: 'Platform Team',
      environment: 'production',
      currentVersion: '16.4',
      dependencies: [],
    },
  )

  const paymentApi = await upsert(
    '*[_type == "service" && name == $name][0]{_id}',
    {name: 'payment-api'},
    {
      _type: 'service',
      name: 'payment-api',
      description: 'Processes customer payments.',
      repository: 'https://github.com/example/payment-api',
      owner: 'Payments Team',
      environment: 'production',
      currentVersion: '1.0.1',
      dependencies: [reference(postgres._id, 'postgres')],
    },
  )

  const checkoutApi = await upsert(
    '*[_type == "service" && name == $name][0]{_id}',
    {name: 'checkout-api'},
    {
      _type: 'service',
      name: 'checkout-api',
      description: 'Coordinates checkout, inventory, and payment requests.',
      repository: 'https://github.com/example/checkout-api',
      owner: 'Checkout Team',
      environment: 'production',
      currentVersion: '2.3.0',
      dependencies: [reference(paymentApi._id, 'payment-api')],
    },
  )

  const webApp = await upsert(
    '*[_type == "service" && name == $name][0]{_id}',
    {name: 'web-app'},
    {
      _type: 'service',
      name: 'web-app',
      description: 'Customer-facing storefront and checkout interface.',
      repository: 'https://github.com/example/web-app',
      owner: 'Web Team',
      environment: 'production',
      currentVersion: '4.8.2',
      dependencies: [reference(checkoutApi._id, 'checkout-api')],
    },
  )

  const paymentPoolChange = await upsert(
    '*[_type == "change" && service._ref == $service && description == $description][0]{_id}',
    {
      service: paymentApi._id,
      description: 'Reduced database connection pool size',
    },
    {
      _type: 'change',
      service: reference(paymentApi._id),
      type: 'configuration',
      description: 'Reduced database connection pool size',
      timestamp: '2026-09-18T09:30:00.000Z',
      author: 'Payments Team',
      previousValue: 'DB_POOL_SIZE=20',
      newValue: 'DB_POOL_SIZE=10',
    },
  )

  const checkoutTimeoutChange = await upsert(
    '*[_type == "change" && service._ref == $service && description == $description][0]{_id}',
    {
      service: checkoutApi._id,
      description: 'Reduced payment request timeout',
    },
    {
      _type: 'change',
      service: reference(checkoutApi._id),
      type: 'configuration',
      description: 'Reduced payment request timeout',
      timestamp: '2026-09-19T14:15:00.000Z',
      author: 'Checkout Team',
      previousValue: 'PAYMENT_TIMEOUT_MS=5000',
      newValue: 'PAYMENT_TIMEOUT_MS=1500',
    },
  )

  const paymentDeployment = await upsert(
    '*[_type == "deployment" && service._ref == $service && version == $version][0]{_id}',
    {service: paymentApi._id, version: '1.0.1'},
    {
      _type: 'deployment',
      service: reference(paymentApi._id),
      version: '1.0.1',
      environment: 'production',
      deployedAt: '2026-09-18T10:00:00.000Z',
      commit: 'abc1234',
      changes: [reference(paymentPoolChange._id, 'payment-pool-change')],
      deployedBy: 'Payments Team',
      status: 'succeeded',
    },
  )

  const checkoutDeployment = await upsert(
    '*[_type == "deployment" && service._ref == $service && version == $version][0]{_id}',
    {service: checkoutApi._id, version: '2.3.0'},
    {
      _type: 'deployment',
      service: reference(checkoutApi._id),
      version: '2.3.0',
      environment: 'production',
      deployedAt: '2026-09-19T14:30:00.000Z',
      commit: 'def5678',
      changes: [reference(checkoutTimeoutChange._id, 'checkout-timeout-change')],
      deployedBy: 'Checkout Team',
      status: 'rolledBack',
    },
  )

  const paymentRunbook = await upsert(
    '*[_type == "runbook" && service._ref == $service && title == $title][0]{_id}',
    {service: paymentApi._id, title: 'Payment API database connection issues'},
    {
      _type: 'runbook',
      service: reference(paymentApi._id),
      title: 'Payment API database connection issues',
      symptoms: 'Payment requests fail or time out because database connections are unavailable.',
      procedure: procedure('payment-db', [
        'Check payment-api logs for connection pool errors.',
        'Confirm postgres is reachable and healthy.',
        'Compare the current connection pool size with the previous configuration.',
        'Restore the previous pool-size configuration if needed.',
        'Restart payment-api and monitor payment success rates.',
      ]),
      applicableVersions: ['1.0.0', '1.0.1'],
      environment: 'production',
      lastUpdated: '2026-09-18T11:15:00.000Z',
    },
  )

  const checkoutRunbook = await upsert(
    '*[_type == "runbook" && service._ref == $service && title == $title][0]{_id}',
    {service: checkoutApi._id, title: 'Checkout payment timeouts'},
    {
      _type: 'runbook',
      service: reference(checkoutApi._id),
      title: 'Checkout payment timeouts',
      symptoms: 'Checkout requests fail while payment-api remains healthy or responds slowly.',
      procedure: procedure('checkout-timeout', [
        'Check checkout-api timeout and upstream error metrics.',
        'Compare the configured payment timeout with payment-api latency.',
        'Restore the previous timeout value.',
        'Roll back the latest checkout-api deployment if failures continue.',
        'Confirm successful checkout requests from web-app.',
      ]),
      applicableVersions: ['2.3.0'],
      environment: 'production',
      lastUpdated: '2026-09-19T15:30:00.000Z',
    },
  )

  await upsert(
    '*[_type == "incident" && incidentId == $incidentId][0]{_id}',
    {incidentId: 'INC-142'},
    {
      _type: 'incident',
      incidentId: 'INC-142',
      title: 'Payment requests failing',
      affectedServices: [
        reference(paymentApi._id, 'payment-api'),
        reference(postgres._id, 'postgres'),
      ],
      severity: 'sev2',
      startedAt: '2026-09-18T10:20:00.000Z',
      resolvedAt: '2026-09-18T11:10:00.000Z',
      symptoms: 'Payment requests failed or timed out due to exhausted database connections.',
      relatedDeployments: [reference(paymentDeployment._id, 'payment-deployment')],
      relatedChanges: [reference(paymentPoolChange._id, 'payment-pool-change')],
      rootCause: 'The reduced database connection pool was too small for production traffic.',
      resolution: 'Restored DB_POOL_SIZE from 10 to 20 and restarted payment-api.',
      relatedRunbook: reference(paymentRunbook._id),
    },
  )

  await upsert(
    '*[_type == "incident" && incidentId == $incidentId][0]{_id}',
    {incidentId: 'INC-208'},
    {
      _type: 'incident',
      incidentId: 'INC-208',
      title: 'Checkout requests timing out',
      affectedServices: [
        reference(webApp._id, 'web-app'),
        reference(checkoutApi._id, 'checkout-api'),
        reference(paymentApi._id, 'payment-api'),
      ],
      severity: 'sev2',
      startedAt: '2026-09-19T14:45:00.000Z',
      resolvedAt: '2026-09-19T15:25:00.000Z',
      symptoms:
        'Customers saw payment errors during checkout while payment-api remained available.',
      relatedDeployments: [reference(checkoutDeployment._id, 'checkout-deployment')],
      relatedChanges: [reference(checkoutTimeoutChange._id, 'checkout-timeout-change')],
      rootCause: 'The checkout-api payment timeout was lower than normal payment-api latency.',
      resolution: 'Rolled back checkout-api 2.3.0 and restored PAYMENT_TIMEOUT_MS to 5000.',
      relatedRunbook: reference(checkoutRunbook._id),
    },
  )

  console.log(
    'Demo dataset is ready: 4 services, 2 changes, 2 deployments, 2 runbooks, 2 incidents.',
  )
}

seed().catch((error) => {
  console.error(error)
  throw error
})
