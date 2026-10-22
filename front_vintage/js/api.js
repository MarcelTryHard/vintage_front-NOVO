const api = axios.create({
  baseURL: 'http://127.0.0.1:3000/api'
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');

  if (token) {
    config.headers.Authorization = 'Bearer ' + token;
  }

  return config;
});

api.interceptors.response.use(
  (resposta) => resposta,
  (erro) => {
    const url = erro.config?.url || '';

    if (erro.response?.status === 401 && !url.includes('/login')) {
      sair();
    }

    return Promise.reject(erro);
  }
);