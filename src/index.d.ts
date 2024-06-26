interface QueryOptions {
  column: string;
  operand: string;
  value: any;
}

interface Query {
  collection: Collection;
  field: string;
  operator: string;
  value: any;
}

interface Collection {
  db: any;
  table: string;
}

interface SecuritySettings {
  authentication: string;
  passwordPolicy: {
    minLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumbers: boolean;
    requireSpecialChars: boolean;
  };
  roles: {
    [role: string]: string[];
  };
}

interface SMTPSettings {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

interface EmailSettings {
  smtp: SMTPSettings;
  from: string;
}

interface I18nSettings {
  defaultLanguage: string;
  supportedLanguages: string[];
}

interface LoggingSettings {
  level: string;
  filePath: string;
}

interface PushNotificationSettings {
  enabled: boolean;
  apiKey: string;
}

interface EmailNotificationSettings {
  enabled: boolean;
}

interface NotificationsSettings {
  push: PushNotificationSettings;
  email: EmailNotificationSettings;
}

interface AnalyticsSettings {
  enabled: boolean;
  apiKey: string;
}

interface AppConfig {
  security: SecuritySettings;
  email: EmailSettings;
  i18n: I18nSettings;
  logging: LoggingSettings;
  notifications: NotificationsSettings;
  analytics: AnalyticsSettings;
}
