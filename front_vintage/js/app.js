const conteudo = document.getElementById('conteudo');
let usuario = JSON.parse(localStorage.getItem('usuario') || 'null');

function esc(texto) {
  return String(texto ?? '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );
}

function mostrarErro(e) {
  alert(e.response?.data?.erro || 'Erro ao comunicar com o servidor.');
}

const telas = {
  clientes: {
    titulo: 'Clientes',
    perfis: ['admin', 'vendedor'],
    campos: [
      { nome: 'nome', rotulo: 'Nome' },
      { nome: 'email', rotulo: 'E-mail' },
      { nome: 'telefone', rotulo: 'Telefone' }
    ]
  },
  produtos: {
    titulo: 'Produtos',
    perfis: ['admin', 'estoquista'],
    campos: [
      { nome: 'nome', rotulo: 'Nome' },
      { nome: 'categoria', rotulo: 'Categoria' },
      { nome: 'preco', rotulo: 'Preço (R$)', tipo: 'number' },
      { nome: 'estoque', rotulo: 'Estoque', tipo: 'number' }
    ]
  },
  lojas: {
    titulo: 'Lojas',
    perfis: ['admin', 'estoquista'],
    campos: [
      { nome: 'nome', rotulo: 'Nome' },
      { nome: 'endereco', rotulo: 'Endereço' },
      { nome: 'cidade', rotulo: 'Cidade' }
    ]
  },
  fornecedores: {
    titulo: 'Fornecedores',
    perfis: ['admin', 'estoquista'],
    campos: [
      { nome: 'nome', rotulo: 'Nome' },
      { nome: 'cnpj', rotulo: 'CNPJ' },
      { nome: 'telefone', rotulo: 'Telefone' },
      { nome: 'email', rotulo: 'E-mail' }
    ]
  }
};

const rotulos = {
  clientes: 'Clientes',
  produtos: 'Produtos',
  lojas: 'Lojas',
  fornecedores: 'Fornecedores',
  vendas: 'Vendas',
  pagamentos: 'Pagamentos',
  usuarios: 'Usuários'
};

const menuPorPerfil = {
  admin: ['clientes', 'produtos', 'lojas', 'fornecedores', 'vendas', 'pagamentos', 'usuarios'],
  vendedor: ['clientes', 'produtos', 'lojas', 'vendas', 'pagamentos'],
  estoquista: ['produtos', 'lojas', 'fornecedores']
};

document.getElementById('formLogin').addEventListener('submit', async e => {
  e.preventDefault();

  const mensagem = document.getElementById('erroLogin');
  mensagem.textContent = '';

  try {
    const resposta = await api.post('/login', {
      email: document.getElementById('loginEmail').value.trim(),
      senha: document.getElementById('loginSenha').value
    });

    localStorage.setItem('token', resposta.data.token);
    localStorage.setItem('usuario', JSON.stringify(resposta.data.usuario));

    usuario = resposta.data.usuario;
    iniciar();
  } catch (erro) {
    mensagem.textContent = erro.response?.data?.erro || 'E-mail ou senha inválidos.';
  }
});

document.getElementById('btnMostrarCadastro').addEventListener('click', () => {
  document.getElementById('formLogin').hidden = true;
  document.getElementById('formCadastro').hidden = false;
  document.getElementById('erroCadastro').textContent = '';
});

document.getElementById('btnVoltarLogin').addEventListener('click', () => {
  document.getElementById('formCadastro').hidden = true;
  document.getElementById('formLogin').hidden = false;
  document.getElementById('erroLogin').textContent = '';
});

document.getElementById('formCadastro').addEventListener('submit', async e => {
  e.preventDefault();

  const mensagem = document.getElementById('erroCadastro');
  mensagem.textContent = '';

  const nome = document.getElementById('cadNome').value.trim();
  const email = document.getElementById('cadEmail').value.trim();
  const senha = document.getElementById('cadSenha').value;

  if (!nome || !email || !senha) {
    mensagem.textContent = 'Preencha todos os campos.';
    return;
  }

  if (senha.length < 6) {
    mensagem.textContent = 'A senha deve ter pelo menos 6 caracteres.';
    return;
  }

  try {
    await api.post('/cadastro', { nome, email, senha });

    alert('Conta criada com sucesso! Entre com seu e-mail e sua senha.');

    document.getElementById('formCadastro').reset();
    document.getElementById('formCadastro').hidden = true;
    document.getElementById('formLogin').hidden = false;
    document.getElementById('loginEmail').value = email;
    document.getElementById('loginSenha').value = '';
  } catch (erro) {
    mensagem.textContent = erro.response?.data?.erro || 'Não foi possível criar a conta.';
  }
});

function sair() {
  localStorage.removeItem('token');
  localStorage.removeItem('usuario');
  usuario = null;
  mostrarLogin();
}

function mostrarLogin() {
  document.getElementById('telaLogin').hidden = false;
  document.getElementById('telaApp').hidden = true;
  document.getElementById('formLogin').hidden = false;
  document.getElementById('formCadastro').hidden = true;
}

function iniciar() {
  if (!usuario || !menuPorPerfil[usuario.perfil]) {
    sair();
    return;
  }

  document.getElementById('telaLogin').hidden = true;
  document.getElementById('telaApp').hidden = false;
  document.getElementById('infoUsuario').textContent =
    `${usuario.nome} (${usuario.perfil})`;

  document.getElementById('menu').innerHTML =
    menuPorPerfil[usuario.perfil]
      .map(t => `<button type="button" onclick="abrirTela('${t}')">${rotulos[t]}</button>`)
      .join('');

  abrirTela(menuPorPerfil[usuario.perfil][0]);
}

async function abrirTela(nome) {
  try {
    if (telas[nome]) await mostrarCrud(nome);
    else if (nome === 'vendas') await mostrarVendas();
    else if (nome === 'pagamentos') await mostrarPagamentos();
    else if (nome === 'usuarios') await mostrarUsuarios();
  } catch (erro) {
    mostrarErro(erro);
  }
}

let dadosAtuais = [];

async function mostrarCrud(chave) {
  const cfg = telas[chave];
  const podeEditar = cfg.perfis.includes(usuario.perfil);

  dadosAtuais = (await api.get('/' + chave)).data;

  let html = `<h2>${cfg.titulo}</h2>`;

  if (podeEditar) {
    html += '<form id="formCrud"><input type="hidden" name="id">';

    cfg.campos.forEach(c => {
      html += `<label>${c.rotulo}<br><input name="${c.nome}" type="${c.tipo || 'text'}" step="any" required></label>`;
    });

    html += `<br><button type="submit">Salvar</button>
      <button type="button" onclick="abrirTela('${chave}')">Limpar</button></form>`;
  }

  html += '<table><tr><th>ID</th>' +
    cfg.campos.map(c => `<th>${c.rotulo}</th>`).join('') +
    '<th>Ações</th></tr>';

  dadosAtuais.forEach(linha => {
    html += `<tr><td>${esc(linha.id)}</td>` +
      cfg.campos.map(c => `<td>${esc(linha[c.nome])}</td>`).join('');

    html += podeEditar
      ? `<td><button onclick="editar('${chave}', ${Number(linha.id)})">Editar</button>
          <button onclick="excluir('${chave}', ${Number(linha.id)})">Excluir</button></td>`
      : '<td>-</td>';

    html += '</tr>';
  });

  conteudo.innerHTML = html + '</table>';

  if (podeEditar) {
    document.getElementById('formCrud').addEventListener('submit', e => {
      e.preventDefault();
      salvar(chave);
    });
  }
}

async function salvar(chave) {
  try {
    const dados = Object.fromEntries(new FormData(document.getElementById('formCrud')));

    if (dados.id) await api.put(`/${chave}/${dados.id}`, dados);
    else await api.post('/' + chave, dados);

    await mostrarCrud(chave);
  } catch (erro) {
    mostrarErro(erro);
  }
}

function editar(chave, id) {
  const linha = dadosAtuais.find(l => Number(l.id) === Number(id));
  const form = document.getElementById('formCrud');

  if (!linha || !form) return;

  form.elements.id.value = linha.id;

  telas[chave].campos.forEach(c => {
    form.elements[c.nome].value = linha[c.nome] ?? '';
  });

  window.scrollTo(0, 0);
}

async function excluir(chave, id) {
  if (!confirm('Deseja realmente excluir?')) return;

  try {
    await api.delete(`/${chave}/${id}`);
    await mostrarCrud(chave);
  } catch (erro) {
    mostrarErro(erro);
  }
}

let carrinho = [];
let listaProdutos = [];

const montarOpcoes = (lista, texto) =>
  lista.map(i => `<option value="${i.id}">${esc(texto(i))}</option>`).join('');

async function mostrarVendas() {
  const [clientes, lojas, produtos, vendas] = await Promise.all([
    api.get('/clientes'),
    api.get('/lojas'),
    api.get('/produtos'),
    api.get('/vendas')
  ]);

  listaProdutos = produtos.data;

  let html = `<h2>Nova venda</h2>
    <label>Cliente<br><select id="vCliente" required>${montarOpcoes(clientes.data, c => c.nome)}</select></label>
    <label>Loja<br><select id="vLoja" required>${montarOpcoes(lojas.data, l => l.nome)}</select></label><br>
    <label>Produto<br><select id="vProduto" required>${montarOpcoes(listaProdutos, p => `${p.nome} - R$ ${p.preco} (estoque: ${p.estoque})`)}</select></label>
    <label>Quantidade<br><input id="vQtd" type="number" min="1" value="1"></label>
    <button onclick="adicionarAoCarrinho()">Adicionar</button>
    <div id="carrinho"></div>
    <button onclick="finalizarVenda()">Finalizar venda</button>
    <h2>Vendas realizadas</h2>
    <table><tr><th>ID</th><th>Cliente</th><th>Loja</th><th>Total</th><th>Data</th></tr>`;

  vendas.data.forEach(v => {
    html += `<tr><td>${esc(v.id)}</td><td>${esc(v.cliente)}</td><td>${esc(v.loja)}</td>
      <td>R$ ${esc(v.total)}</td><td>${esc(new Date(v.data_venda).toLocaleString('pt-BR'))}</td></tr>`;
  });

  conteudo.innerHTML = html + '</table>';
  desenharCarrinho();
}

function adicionarAoCarrinho() {
  const id = Number(document.getElementById('vProduto').value);
  const quantidade = Number(document.getElementById('vQtd').value);
  const produto = listaProdutos.find(p => Number(p.id) === id);

  if (!produto || !Number.isInteger(quantidade) || quantidade < 1) {
    alert('Escolha um produto e uma quantidade válida.');
    return;
  }

  if (quantidade > Number(produto.estoque)) {
    alert('Quantidade maior que o estoque disponível.');
    return;
  }

  carrinho.push({
    produto_id: id,
    nome: produto.nome,
    preco: Number(produto.preco),
    quantidade
  });

  desenharCarrinho();
}

function desenharCarrinho() {
  const area = document.getElementById('carrinho');
  if (!area) return;

  let total = 0;
  let html = '<table><tr><th>Produto</th><th>Qtd</th><th>Subtotal</th><th></th></tr>';

  carrinho.forEach((item, i) => {
    total += item.preco * item.quantidade;
    html += `<tr><td>${esc(item.nome)}</td><td>${item.quantidade}</td>
      <td>R$ ${(item.preco * item.quantidade).toFixed(2)}</td>
      <td><button onclick="carrinho.splice(${i},1);desenharCarrinho()">Remover</button></td></tr>`;
  });

  area.innerHTML = html + `</table><p><strong>Total: R$ ${total.toFixed(2)}</strong></p>`;
}

async function finalizarVenda() {
  if (!carrinho.length) {
    alert('Adicione ao menos um produto.');
    return;
  }

  try {
    await api.post('/vendas', {
      cliente_id: document.getElementById('vCliente').value,
      loja_id: document.getElementById('vLoja').value,
      itens: carrinho.map(i => ({
        produto_id: i.produto_id,
        quantidade: i.quantidade
      }))
    });

    carrinho = [];
    alert('Venda registrada!');
    await mostrarVendas();
  } catch (erro) {
    mostrarErro(erro);
  }
}

async function mostrarPagamentos() {
  const [vendas, pagamentos] = await Promise.all([
    api.get('/vendas'),
    api.get('/pagamentos')
  ]);

  let html = `<h2>Registrar pagamento</h2>
    <label>Venda<br><select id="pVenda" required>${montarOpcoes(vendas.data, v => `#${v.id} - ${v.cliente} - R$ ${v.total}`)}</select></label>
    <label>Método<br><select id="pMetodo">
      <option value="pix">PIX</option>
      <option value="cartao">Cartão</option>
      <option value="boleto">Boleto</option>
    </select></label>
    <label>Valor (R$)<br><input id="pValor" type="number" step="0.01" min="0.01" required></label>
    <button onclick="salvarPagamento()">Registrar</button>
    <h2>Pagamentos</h2>
    <table><tr><th>ID</th><th>Venda</th><th>Método</th><th>Valor</th><th>Data</th></tr>`;

  pagamentos.data.forEach(p => {
    html += `<tr><td>${esc(p.id)}</td><td>#${esc(p.venda_id)}</td><td>${esc(p.metodo)}</td>
      <td>R$ ${esc(p.valor)}</td><td>${esc(new Date(p.data_pagamento).toLocaleString('pt-BR'))}</td></tr>`;
  });

  conteudo.innerHTML = html + '</table>';
}

async function salvarPagamento() {
  try {
    await api.post('/pagamentos', {
      venda_id: document.getElementById('pVenda').value,
      metodo: document.getElementById('pMetodo').value,
      valor: document.getElementById('pValor').value
    });

    alert('Pagamento registrado!');
    await mostrarPagamentos();
  } catch (erro) {
    mostrarErro(erro);
  }
}

async function mostrarUsuarios() {
  const usuarios = (await api.get('/usuarios')).data;

  let html = `<h2>Novo usuário</h2>
    <label>Nome<br><input id="uNome" required></label>
    <label>E-mail<br><input id="uEmail" type="email" required></label>
    <label>Senha<br><input id="uSenha" type="password" required></label>
    <label>Perfil<br><select id="uPerfil">
      <option value="vendedor">Vendedor</option>
      <option value="estoquista">Estoquista</option>
      <option value="admin">Admin</option>
    </select></label>
    <button onclick="salvarUsuario()">Criar</button>
    <h2>Usuários</h2>
    <table><tr><th>ID</th><th>Nome</th><th>E-mail</th><th>Perfil</th><th>Ações</th></tr>`;

  usuarios.forEach(u => {
    html += `<tr><td>${esc(u.id)}</td><td>${esc(u.nome)}</td><td>${esc(u.email)}</td>
      <td>${esc(u.perfil)}</td><td><button onclick="excluirUsuario(${Number(u.id)})">Excluir</button></td></tr>`;
  });

  conteudo.innerHTML = html + '</table>';
}

async function salvarUsuario() {
  try {
    await api.post('/usuarios', {
      nome: document.getElementById('uNome').value.trim(),
      email: document.getElementById('uEmail').value.trim(),
      senha: document.getElementById('uSenha').value,
      perfil: document.getElementById('uPerfil').value
    });

    alert('Usuário criado com sucesso!');
    await mostrarUsuarios();
  } catch (erro) {
    mostrarErro(erro);
  }
}

async function excluirUsuario(id) {
  if (!confirm('Excluir este usuário?')) return;

  try {
    await api.delete('/usuarios/' + id);
    await mostrarUsuarios();
  } catch (erro) {
    mostrarErro(erro);
  }
}

if (localStorage.getItem('token') && usuario) {
  iniciar();
} else {
  localStorage.removeItem('token');
  localStorage.removeItem('usuario');
  usuario = null;
  mostrarLogin();
}
