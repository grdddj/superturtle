import React from "react";
import { Snackbar } from "@material-ui/core";
import Alert from "@material-ui/lab/Alert";

const DEFAULT_ERROR_MESSAGE = "Something went wrong. Please try again.";

const useErrorToast = (options = {}) => {
  const {
    autoHideDuration = 4000,
    anchorOrigin = { vertical: "bottom", horizontal: "center" },
  } = options;
  const [snackbarState, setSnackbarState] = React.useState({
    open: false,
    message: "",
  });

  const showError = React.useCallback((message = DEFAULT_ERROR_MESSAGE) => {
    const nextMessage =
      typeof message === "string" && message.trim().length > 0
        ? message
        : DEFAULT_ERROR_MESSAGE;

    setSnackbarState({
      open: true,
      message: nextMessage,
    });
  }, []);

  const handleErrorToastClose = React.useCallback((_, reason) => {
    if (reason === "clickaway") {
      return;
    }

    setSnackbarState((previousValue) => ({
      ...previousValue,
      open: false,
    }));
  }, []);

  const ErrorToast = () => (
    <Snackbar
      open={snackbarState.open}
      autoHideDuration={autoHideDuration}
      onClose={handleErrorToastClose}
      anchorOrigin={anchorOrigin}
    >
      <Alert onClose={handleErrorToastClose} severity="error" variant="filled">
        {snackbarState.message}
      </Alert>
    </Snackbar>
  );

  return {
    showError,
    ErrorToast,
  };
};

export default useErrorToast;
