import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { ReadingPanel } from './ReadingPanel';

const article = {
  id: 'de8f726c-b12e-4b47-9b5a-bec6f473cd05',
  title: 'A small beginning',
  source: { id: 'source', name: 'LingoCurrent fixture' },
  category: 'Practice',
  collectedAt: '2026-11-16T12:00:00Z',
  lastVisitedAt: null,
};
const meta = {
  title: 'Reading/ReadingPanel',
  component: ReadingPanel,
  tags: ['autodocs'],
  args: { articles: [article], onOpen: fn(), onClose: fn(), onRetry: fn(), onPlay: fn() },
} satisfies Meta<typeof ReadingPanel>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Ready: Story = {};
export const Empty: Story = { args: { articles: [] } };
export const Loading: Story = { args: { loading: true } };
export const Error: Story = { args: { error: 'Unable to save visit. Please try again.' } };
export const Detail: Story = {
  args: {
    article: {
      ...article,
      body: 'Every day, a little reading can open a new door.',
      durationMs: 4000,
      sentences: [
        {
          index: 0,
          paragraphIndex: 0,
          text: 'Every day, a little reading can open a new door.',
          startMs: 0,
          endMs: 4000,
        },
      ],
    },
  },
};
export const LongContent: Story = {
  args: {
    articles: [
      {
        ...article,
        title:
          'Reading a little every day helps us discover unfamiliar ideas and understand a changing world. '.repeat(
            8,
          ),
      },
    ],
  },
};
