/**
 * @format
 */
import 'react-native';
import React from 'react';
import {it, expect} from '@jest/globals';
import renderer, {act} from 'react-test-renderer';
import App from '../App';

it('renders the app shell without crashing', () => {
  let tree: renderer.ReactTestRenderer | undefined;
  act(() => {
    tree = renderer.create(<App />);
  });
  expect(tree).toBeTruthy();
  act(() => tree?.unmount());
});
