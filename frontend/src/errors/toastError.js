import { toast } from "react-toastify";
import { i18n } from "../translate/i18n";
import { isString } from 'lodash';

const toastError = err => {
	const errorMsg = err.response?.data?.error;
	const errorMessage = err.response?.data?.message;

	// Tratamento específico para erros de autenticação
	if (err.response?.status === 401) {
		toast.error("Erro de autenticação. Verifique a API Key nas configurações de Integração.", {
			toastId: "authError",
		});
		return;
	}

	if (errorMsg) {
		if (i18n.exists(`backendErrors.${errorMsg}`)) {
			toast.error(i18n.t(`backendErrors.${errorMsg}`), {
				toastId: errorMsg,
				autoClose: 2000,
				hideProgressBar: false,
				closeOnClick: true,
				pauseOnHover: false,
				draggable: true,
				progress: undefined,
				theme: "light",
			});

			return;
		} else {

			toast.error(errorMsg, {
				toastId: errorMsg,
				autoClose: 2000,
				hideProgressBar: false,
				closeOnClick: true,
				pauseOnHover: false,
				draggable: true,
				progress: undefined,
				theme: "light",
			});

			return;
		}
	} else if (errorMessage) {
		toast.error(errorMessage, {
			toastId: "errorMessage",
			autoClose: 2000,
			hideProgressBar: false,
			closeOnClick: true,
			pauseOnHover: false,
			draggable: true,
			progress: undefined,
			theme: "light",
		});
	} else {
		console.error("An error occurred!");
		// Optionally log the error to an external service here
		/*
		toast.error("An error occurred!");
		*/
		toast.error("Ocorreu um erro ao processar sua solicitação.", {
			toastId: "genericError",
			autoClose: 2000,
			hideProgressBar: false,
			closeOnClick: true,
			pauseOnHover: false,
			draggable: true,
			progress: undefined,
			theme: "light",
		});
		return;
	}
};

export default toastError;