export function renderWithHooks(current, workInProgress, Component, props) {
  const children = Component(props);
  return children;
}
