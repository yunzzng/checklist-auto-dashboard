## Checklist Auto Dashboard

Figma 링크를 넣고 버튼을 누르면, 실무 QA 체크리스트를 자동 생성해 **새 창 HTML 표**로 보여주는 대시보드입니다.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### Environment Variables (optional)

키를 UI에서 입력해도 되고, 서버 환경변수로 설정해도 됩니다.

- `FIGMA_TOKEN`: node-id 포함 링크일 때 노드 설명/스크린샷 참고
- `OPENAI_API_KEY`: 체크리스트(20개+) 생성
- `OPENAI_MODEL`: 기본값 `gpt-4.1-mini`

로컬에서는 `.env.local`을 만들고 `.env.example`을 참고하세요.

## Deploy on Vercel

1. Vercel에서 GitHub 레포를 Import
2. (선택) Project Settings → Environment Variables에 `FIGMA_TOKEN`, `OPENAI_API_KEY`, `OPENAI_MODEL` 등록
3. Deploy

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
