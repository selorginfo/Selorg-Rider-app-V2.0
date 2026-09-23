import {useEffect, useState} from 'react';
import {getAppConfig, subscribeAppConfig, type RuntimeAppConfig} from '../config/appConfig';

export function useAppConfig(): RuntimeAppConfig {
  const [config, setConfig] = useState(getAppConfig);
  useEffect(() => subscribeAppConfig(() => setConfig(getAppConfig())), []);
  return config;
}
