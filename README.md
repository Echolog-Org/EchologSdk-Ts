# Echolog SDK

A TypeScript/JavaScript SDK for integrating with the Echolog logging and monitoring service.

## Features

- 📊 Type-safe API with TypeScript generics for custom metadata
- 🔍 Automatic error and unhandled promise rejection capture
- 📝 Console logging capture and correlation
- 🌐 Network request monitoring for XHR and Fetch
- 📱 Session tracking with user journey analysis
- 🔒 Secure API key authentication
- 🚀 Efficient batching and transmission of events
- 📉 Configurable sampling rates for high-volume applications
- 🔄 Support for synchronous transmission during page unloads

## Installation

```bash
npm install @echolog/sdk
# or
yarn add @echolog/sdk
```

## Quick Start

```typescript
import { initEcholog, UserData, EchologEvent, EventMetadata } from '@echolog/sdk';

// Define your custom metadata type
interface CustomMetadata extends EventMetadata {
  page: string;
  step: string;
  flowId?: string;
}

// Initialize the SDK
const echolog = initEcholog<CustomMetadata>({
  apiKey: 'your_api_key_here',
  environment: 'production',
  enableConsoleCapture: true,
  enableNetworkCapture: true,
  captureUnhandledErrors: true,
  captureUnhandledPromiseRejections: true,
  release: '1.5.0',
});

// Start tracking a user session
echolog.startSession();

// Capture a custom error
try {
  // Your code here
} catch (error) {
  const userData: UserData = {
    id: 'user-123',
    email: 'user@example.com'
  };
  
  echolog.captureException(error, {
    user: userData,
    metadata: { page: 'checkout', step: 'payment', flowId: 'f-12345' },
    level: 'error',
    tags: { version: '1.5.0' }
  });
}

// Log a custom message
echolog.captureMessage('User completed onboarding', {
  level: 'info',
  metadata: { page: 'onboarding', step: 'complete' },
  tags: { feature: 'onboarding' }
});

// End session when appropriate
window.addEventListener('beforeunload', () => {
  echolog.endSession();
});
```

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| apiKey | string | *required* | Your Echolog API key |
| apiUrl | string | https://api.echolog.io/events | The URL for the Echolog API |
| environment | string | production | Environment name (development, testing, production) |
| release | string | undefined | Version or release identifier of your application |
| enableConsoleCapture | boolean | false | Capture console.log/info/warn/error calls |
| enableNetworkCapture | boolean | false | Capture XHR and Fetch API requests |
| captureUnhandledErrors | boolean | false | Automatically capture unhandled errors |
| captureUnhandledPromiseRejections | boolean | false | Capture unhandled promise rejections |
| maxBatchSize | number | undefined | Maximum number of events to batch before sending |
| flushInterval | number | 5000 | Interval in ms to automatically flush the event queue |
| beforeSend | function | undefined | Function to modify/filter events before sending |
| sampleRate | number | undefined | Percentage of events to capture (0.0 to 1.0) |

## Advanced Usage

### Custom Event Metadata

Define custom metadata types for better type checking:

```typescript
interface PaymentMetadata extends EventMetadata {
  orderId: string;
  amount: number;
  currency: string;
  paymentMethod: string;
}

echolog.captureMessage('Payment processed', {
  level: 'info',
  metadata: {
    orderId: 'order-123',
    amount: 99.99,
    currency: 'USD',
    paymentMethod: 'credit_card'
  } as PaymentMetadata
});
```

### Breadcrumbs

Track user journey with breadcrumbs:

```typescript
import { Breadcrumb } from '@echolog/sdk';

const breadcrumb: Breadcrumb = {
  type: 'navigation',
  category: 'route-change',
  message: 'User navigated to product page',
  data: { from: '/home', to: '/products/123' }
};

echolog.captureEvent({
  level: 'info',
  message: 'Page view',
  breadcrumbs: [breadcrumb]
});
```

### Context Collection

Gather rich context information:

```typescript
import { collectContext } from '@echolog/sdk';

const context = collectContext();
echolog.captureMessage('User interaction', {
  level: 'info',
  context
});
```

## Browser Support

The SDK supports all modern browsers including:

- Chrome (latest 3 versions)
- Firefox (latest 3 versions)
- Safari (latest 3 versions)
- Edge (latest 3 versions)

Internet Explorer 11 support requires additional polyfills for Promises, Fetch API, and other modern JavaScript features.

## License

MIT# EchologSdk-Ts
