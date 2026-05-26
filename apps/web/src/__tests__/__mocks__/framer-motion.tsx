import React from 'react';

type MotionProps = {
  children?: React.ReactNode;
  [key: string]: unknown;
};

function stripMotionProps(props: MotionProps) {
  const {
    animate,
    exit,
    initial,
    transition,
    whileHover,
    whileTap,
    variants,
    ...rest
  } = props;
  void animate;
  void exit;
  void initial;
  void transition;
  void whileHover;
  void whileTap;
  void variants;
  return rest;
}

export const m = new Proxy(
  {},
  {
    get: (_target, tag: string) =>
      function MotionComponent(props: MotionProps) {
        return React.createElement(tag, stripMotionProps(props));
      },
  },
) as Record<string, React.FC<MotionProps>>;

export function AnimatePresence({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
