import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, within } from 'storybook/test';
import { WelcomePanel } from './WelcomePanel';

const meta = {
  title: 'Workspace/WelcomePanel',
  component: WelcomePanel,
  tags: ['autodocs'],
} satisfies Meta<typeof WelcomePanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Ready: Story = {
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByRole('heading', { name: 'LingoCurrent' }),
    ).toBeVisible();
  },
};
export const Empty: Story = { args: { state: 'empty' } };
export const Loading: Story = { args: { state: 'loading' } };
export const Error: Story = { args: { state: 'error' } };
export const LongContent: Story = {
  args: {
    description: 'Read at your own pace, save words in context, and return for practice. '.repeat(
      12,
    ),
  },
};
