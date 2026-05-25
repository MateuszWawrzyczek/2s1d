import { useRouteError, Link, isRouteErrorResponse } from 'react-router-dom';

export const ErrorPage = () => {
  const error = useRouteError();
  let errorMessage: string;
  if (isRouteErrorResponse(error)) {
    errorMessage = error.statusText;
  } else if (error instanceof Error) {
    errorMessage = error.message;
  } else {
    errorMessage = 'Unknown error occurred';
  }

  return (
    <div style={{ textAlign: 'center', marginTop: '50px' }}>
      <h1>Something went wrong.</h1>
      <p>{errorMessage}</p>
      <Link to="/">Back to main page</Link>
    </div>
  );
};
