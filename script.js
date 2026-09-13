"use strict";

/* ============================================================
   TECH MM
   SISTEMA DE SERVIÇOS E CONSERTOS
   SCRIPT PRINCIPAL
   
============================================================ */

/* ============================================================
   CONFIGURAÇÕES
============================================================ */

const CHAVE_ORDENS = "techMM_ordens_v3";
const CHAVE_CLIENTES = "techMM_clientes_v3";
const CHAVE_EQUIPAMENTOS = "techMM_equipamentos_v3";
const CHAVE_FINANCEIRO = "techMM_financeiro_v3";
const CHAVE_TEMA = "techMM_tema_v3";

const STATUS_OS = {
    ABERTA: "aberta",
    ANALISE: "analise",
    ANDAMENTO: "andamento",
    PECA: "peca",
    PRONTO: "pronto",
    ENTREGUE: "entregue"
};

const STATUS_NOMES = {
    aberta: "Aberta",
    analise: "Em análise",
    andamento: "Em conserto",
    peca: "Aguardando peça",
    pronto: "Pronto",
    entregue: "Entregue"
};

let ordens = [];
let clientes = [];
let equipamentos = [];
let financeiro = [];

let filtroOrdemAtual = "todas";
let idClienteEditando = null;


/* ============================================================
   FUNÇÕES BÁSICAS
============================================================ */

function $(seletor) {
    return document.querySelector(seletor);
}

function $$(seletor) {
    return document.querySelectorAll(seletor);
}

function gerarId(prefixo = "id") {
    return `${prefixo}_${Date.now()}_${Math.random()
        .toString(36)
        .substring(2, 9)}`;
}

function carregarStorage(chave, valorPadrao = []) {
    try {
        const dados = localStorage.getItem(chave);

        if (!dados) {
            return valorPadrao;
        }

        const convertido = JSON.parse(dados);

        return convertido;
    } catch (erro) {
        console.error(`Erro ao carregar ${chave}:`, erro);
        return valorPadrao;
    }
}

function salvarStorage(chave, dados) {
    try {
        localStorage.setItem(chave, JSON.stringify(dados));
        return true;
    } catch (erro) {
        console.error(`Erro ao salvar ${chave}:`, erro);
        return false;
    }
}

function salvarDados() {
    salvarStorage(CHAVE_ORDENS, ordens);
    salvarStorage(CHAVE_CLIENTES, clientes);
    salvarStorage(CHAVE_EQUIPAMENTOS, equipamentos);
    salvarStorage(CHAVE_FINANCEIRO, financeiro);
}

function escaparHTML(valor) {
    if (valor === null || valor === undefined) {
        return "";
    }

    return String(valor)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


/* ============================================================
   NÚMEROS E VALORES
============================================================ */

function converterNumero(valor) {
    if (valor === null || valor === undefined || valor === "") {
        return 0;
    }

    if (typeof valor === "number") {
        return Number.isFinite(valor) ? valor : 0;
    }

    let texto = String(valor).trim();

    texto = texto.replace(/[R$\s]/g, "");

    if (texto.includes(",")) {
        texto = texto.replace(/\./g, "");
        texto = texto.replace(",", ".");
    }

    const numero = parseFloat(texto);

    return Number.isFinite(numero) ? numero : 0;
}

function formatarMoeda(valor) {
    const numero = converterNumero(valor);

    return numero.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}

function obterNumeroCampo(id) {
    const campo = document.getElementById(id);

    if (!campo) {
        return 0;
    }

    return converterNumero(campo.value);
}


/* ============================================================
   TELEFONE
============================================================ */

function limparTelefone(telefone) {
    return String(telefone || "").replace(/\D/g, "");
}

function formatarTelefone(telefone) {
    let numero = limparTelefone(telefone);

    if (numero.length > 11) {
        numero = numero.substring(0, 11);
    }

    if (numero.length <= 10) {
        if (numero.length > 6) {
            return numero.replace(
                /^(\d{2})(\d{4})(\d{0,4}).*/,
                "($1) $2-$3"
            );
        }

        if (numero.length > 2) {
            return numero.replace(
                /^(\d{2})(\d{0,4}).*/,
                "($1) $2"
            );
        }

        return numero;
    }

    return numero.replace(
        /^(\d{2})(\d{5})(\d{0,4}).*/,
        "($1) $2-$3"
    );
}


/* ============================================================
   DATAS
============================================================ */

function formatarData(data) {
    if (!data) {
        return "-";
    }

    const dataObj = new Date(data);

    if (Number.isNaN(dataObj.getTime())) {
        return "-";
    }

    return dataObj.toLocaleDateString("pt-BR");
}

function formatarDataHora(data) {
    if (!data) {
        return "-";
    }

    const dataObj = new Date(data);

    if (Number.isNaN(dataObj.getTime())) {
        return "-";
    }

    return dataObj.toLocaleString("pt-BR");
}


/* ============================================================
   MENSAGENS DO SISTEMA
============================================================ */

function mostrarMensagem(texto, tipo = "sucesso") {
    const elemento = $("#mensagemSistema");

    if (!elemento) {
        return;
    }

    elemento.textContent = texto;
    elemento.hidden = false;

    elemento.classList.remove(
        "sucesso",
        "erro",
        "aviso",
        "info"
    );

    elemento.classList.add(tipo);

    clearTimeout(mostrarMensagem.timer);

    mostrarMensagem.timer = setTimeout(() => {
        elemento.hidden = true;
    }, 3500);
}


/* ============================================================
   TEMA
============================================================ */

function aplicarTema() {
    const temaSalvo = localStorage.getItem(CHAVE_TEMA);

    if (temaSalvo === "claro") {
        document.body.classList.add("tema-claro");
    } else {
        document.body.classList.remove("tema-claro");
    }
}

function alternarTema() {
    const temaClaro =
        document.body.classList.toggle("tema-claro");

    localStorage.setItem(
        CHAVE_TEMA,
        temaClaro ? "claro" : "escuro"
    );
}


/* ============================================================
   NAVEGAÇÃO ENTRE SEÇÕES
============================================================ */

function mostrarSecao(nomeSecao) {
    const secoes = $$(".secao");

    secoes.forEach(secao => {
        const ativa = secao.id === nomeSecao;

        secao.classList.toggle("ativa", ativa);
        secao.hidden = !ativa;
    });

    const botoesMenu = $$(".menu-item");

    botoesMenu.forEach(botao => {
        botao.classList.toggle(
            "ativo",
            botao.dataset.secao === nomeSecao
        );
    });

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

    if (nomeSecao === "dashboard") {
        renderizarDashboard();
    }

    if (nomeSecao === "ordens") {
        renderizarOrdens();
    }

    if (nomeSecao === "clientes") {
        renderizarClientes();
    }

    if (nomeSecao === "equipamentos") {
        renderizarEquipamentos();
    }

    if (nomeSecao === "financeiro") {
        renderizarFinanceiro();
    }

    if (nomeSecao === "novaOrdem") {
        preencherClientesOS();
        calcularTotalOS();
    }
}


/* ============================================================
   FECHAMENTO DE MODAIS
============================================================ */

function fecharModais() {
    document
        .querySelectorAll(".modal-cliente, .modal-overlay, .modal-os")
        .forEach(modal => modal.remove());
}


/* ============================================================
   INICIALIZAÇÃO DOS DADOS
============================================================ */

function carregarDados() {
    ordens = carregarStorage(CHAVE_ORDENS, []);
    clientes = carregarStorage(CHAVE_CLIENTES, []);
    equipamentos = carregarStorage(CHAVE_EQUIPAMENTOS, []);
    financeiro = carregarStorage(CHAVE_FINANCEIRO, []);

    if (!Array.isArray(ordens)) {
        ordens = [];
    }

    if (!Array.isArray(clientes)) {
        clientes = [];
    }

    if (!Array.isArray(equipamentos)) {
        equipamentos = [];
    }

    if (!Array.isArray(financeiro)) {
        financeiro = [];
    }
}


/* ============================================================
   STATUS DA ORDEM
============================================================ */

function obterNomeStatus(status) {
    return STATUS_NOMES[status] || "Aberta";
}

function obterClasseStatus(status) {
    return `status-${status || "aberta"}`;
}


/* ============================================================
   CONTADORES
============================================================ */

function contarOrdensPorStatus(status) {
    return ordens.filter(
        ordem => ordem.status === status
    ).length;
}

function contarPecas() {
    return ordens.filter(
        ordem => ordem.status === STATUS_OS.PECA
    ).length;
}


/* ============================================================
   EXPOSIÇÃO DE FUNÇÕES
============================================================ */

window.alternarTema = alternarTema;
window.mostrarSecao = mostrarSecao;
window.mostrarMensagem = mostrarMensagem;
window.fecharModais = fecharModais;

/* ============================================================
   TECH MM
   SCRIPT PRINCIPAL
   PARTE 2/5
   CLIENTES + EQUIPAMENTOS + FORMULÁRIO DA OS
============================================================ */


/* ============================================================
   CLIENTES
============================================================ */

function preencherClientesOS() {
    const select = $("#clienteOS");

    if (!select) {
        return;
    }

    const valorAtual = select.value;

    select.innerHTML = `
        <option value="">Selecione um cliente</option>
    `;

    const lista = Array.isArray(clientes)
        ? [...clientes].sort((a, b) =>
            String(a.nome || "").localeCompare(
                String(b.nome || ""),
                "pt-BR"
            )
        )
        : [];

    lista.forEach(cliente => {
        const option = document.createElement("option");

        option.value = cliente.id;

        option.textContent =
            `${cliente.nome || "Sem nome"}${
                cliente.telefone
                    ? ` - ${formatarTelefone(cliente.telefone)}`
                    : ""
            }`;

        select.appendChild(option);
    });

    if (
        valorAtual &&
        lista.some(
            cliente =>
                String(cliente.id) ===
                String(valorAtual)
        )
    ) {
        select.value = valorAtual;
    }

    atualizarDadosClienteSelecionado();
}


/* ============================================================
   OBTER CLIENTE
============================================================ */

function obterCliente(id) {
    if (!id) {
        return null;
    }

    return clientes.find(
        cliente =>
            String(cliente.id) ===
            String(id)
    ) || null;
}


/* ============================================================
   ATUALIZAR CLIENTE SELECIONADO NA OS
============================================================ */

function atualizarDadosClienteSelecionado() {
    const select = $("#clienteOS");

    if (!select) {
        return;
    }

    const cliente =
        obterCliente(select.value);

    const telefone =
        $("#telefoneClienteOS");

    const email =
        $("#emailClienteOS");

    if (!cliente) {

        if (telefone) {
            telefone.value = "";
        }

        if (email) {
            email.value = "";
        }

        return;
    }

    if (telefone) {
        telefone.value =
            cliente.telefone
                ? formatarTelefone(
                    cliente.telefone
                  )
                : "";
    }

    if (email) {
        email.value =
            cliente.email || "";
    }
}


/* ============================================================
   ABRIR MODAL DE CLIENTE
============================================================ */

function abrirModalCliente(cliente = null) {

    idClienteEditando =
        cliente
            ? cliente.id
            : null;

    const modalExistente =
        $(".modal-cliente");

    if (modalExistente) {
        modalExistente.remove();
    }

    const modal =
        document.createElement("div");

    modal.className =
        "modal-cliente";

    modal.innerHTML = `
        <div class="modal-conteudo">

            <div class="modal-cabecalho">

                <div>

                    <span class="titulo-pequeno">
                        CADASTRO
                    </span>

                    <h2>
                        ${
                            cliente
                                ? "Editar Cliente"
                                : "Novo Cliente"
                        }
                    </h2>

                </div>

                <button
                    type="button"
                    class="btn-fechar-modal"
                    onclick="fecharModalCliente()"
                    title="Fechar"
                >
                    ×
                </button>

            </div>


            <form id="formClienteModal">

                <div class="campo">

                    <label for="nomeClienteModal">
                        Nome completo *
                    </label>

                    <input
                        type="text"
                        id="nomeClienteModal"
                        required
                        autocomplete="name"
                        value="${escaparHTML(
                            cliente?.nome || ""
                        )}"
                        placeholder="Nome do cliente"
                    >

                </div>


                <div class="campo">

                    <label for="telefoneClienteModal">
                        WhatsApp / Telefone
                    </label>

                    <input
                        type="tel"
                        id="telefoneClienteModal"
                        autocomplete="tel"
                        value="${escaparHTML(
                            cliente?.telefone
                                ? formatarTelefone(
                                    cliente.telefone
                                  )
                                : ""
                        )}"
                        placeholder="(00) 00000-0000"
                    >

                </div>


                <div class="campo">

                    <label for="emailClienteModal">
                        E-mail
                    </label>

                    <input
                        type="email"
                        id="emailClienteModal"
                        autocomplete="email"
                        value="${escaparHTML(
                            cliente?.email || ""
                        )}"
                        placeholder="cliente@email.com"
                    >

                </div>


                <div class="campo">

                    <label for="enderecoClienteModal">
                        Endereço
                    </label>

                    <input
                        type="text"
                        id="enderecoClienteModal"
                        autocomplete="street-address"
                        value="${escaparHTML(
                            cliente?.endereco || ""
                        )}"
                        placeholder="Rua, número, bairro"
                    >

                </div>


                <div class="campo">

                    <label for="cidadeClienteModal">
                        Cidade
                    </label>

                    <input
                        type="text"
                        id="cidadeClienteModal"
                        autocomplete="address-level2"
                        value="${escaparHTML(
                            cliente?.cidade || ""
                        )}"
                        placeholder="Cidade"
                    >

                </div>


                <div class="modal-acoes">

                    <button
                        type="button"
                        class="btn-secundario"
                        onclick="fecharModalCliente()"
                    >
                        Cancelar
                    </button>

                    <button
                        type="submit"
                        class="btn-laranja"
                    >
                        ${
                            cliente
                                ? "Salvar alterações"
                                : "Cadastrar cliente"
                        }
                    </button>

                </div>

            </form>

        </div>
    `;

    document.body.appendChild(modal);


    /* ========================================================
       FORMULÁRIO DO MODAL
    ======================================================== */

    const form =
        $("#formClienteModal");

    if (form) {
        form.addEventListener(
            "submit",
            salvarClienteModal
        );
    }


    /* ========================================================
       MÁSCARA DO TELEFONE
    ======================================================== */

    const telefone =
        $("#telefoneClienteModal");

    if (telefone) {

        telefone.addEventListener(
            "input",
            () => {

                telefone.value =
                    formatarTelefone(
                        telefone.value
                    );

            }
        );

    }


    /* ========================================================
       FOCO NO NOME
    ======================================================== */

    const nome =
        $("#nomeClienteModal");

    if (nome) {
        setTimeout(() => {
            nome.focus();
        }, 100);
    }
}


/* ============================================================
   SALVAR CLIENTE
============================================================ */

function salvarClienteModal(evento) {

    evento.preventDefault();

    const nome =
        $("#nomeClienteModal")
            ?.value
            .trim() || "";

    const telefoneDigitado =
        $("#telefoneClienteModal")
            ?.value
            .trim() || "";

    const email =
        $("#emailClienteModal")
            ?.value
            .trim() || "";

    const endereco =
        $("#enderecoClienteModal")
            ?.value
            .trim() || "";

    const cidade =
        $("#cidadeClienteModal")
            ?.value
            .trim() || "";


    /* ========================================================
       VALIDAÇÃO
    ======================================================== */

    if (!nome) {

        mostrarMensagem(
            "Informe o nome do cliente.",
            "erro"
        );

        $("#nomeClienteModal")?.focus();

        return;
    }


    const telefone =
        limparTelefone(
            telefoneDigitado
        );


    /* ========================================================
       VERIFICAR TELEFONE DUPLICADO
    ======================================================== */

    if (telefone) {

        const clienteDuplicado =
            clientes.find(cliente => {

                if (
                    idClienteEditando &&
                    String(cliente.id) ===
                    String(idClienteEditando)
                ) {
                    return false;
                }

                return (
                    limparTelefone(
                        cliente.telefone
                    ) === telefone
                );

            });


        if (clienteDuplicado) {

            mostrarMensagem(
                `Já existe um cliente cadastrado com este telefone: ${clienteDuplicado.nome}.`,
                "aviso"
            );

            return;
        }

    }


    /* ========================================================
       GUARDAR ID ANTES DE FECHAR O MODAL
    ======================================================== */

    let clienteSelecionadoId =
        idClienteEditando || "";


    /* ========================================================
       EDITAR CLIENTE
    ======================================================== */

    if (idClienteEditando) {

        const cliente =
            obterCliente(
                idClienteEditando
            );

        if (!cliente) {

            mostrarMensagem(
                "Cliente não encontrado.",
                "erro"
            );

            return;
        }


        cliente.nome =
            nome;

        cliente.telefone =
            telefone;

        cliente.email =
            email;

        cliente.endereco =
            endereco;

        cliente.cidade =
            cidade;

        cliente.atualizadoEm =
            new Date().toISOString();


        mostrarMensagem(
            "Cliente atualizado com sucesso.",
            "sucesso"
        );

    }


    /* ========================================================
       NOVO CLIENTE
    ======================================================== */

    else {

        const novoCliente = {

            id:
                gerarId("cli"),

            nome:
                nome,

            telefone:
                telefone,

            email:
                email,

            endereco:
                endereco,

            cidade:
                cidade,

            criadoEm:
                new Date().toISOString()

        };


        clientes.push(
            novoCliente
        );


        clienteSelecionadoId =
            novoCliente.id;


        mostrarMensagem(
            "Cliente cadastrado com sucesso.",
            "sucesso"
        );

    }


    /* ========================================================
       SALVAR
    ======================================================== */

    salvarDados();


    /* ========================================================
       FECHAR MODAL
    ======================================================== */

    fecharModalCliente();


    /* ========================================================
       ATUALIZAR SISTEMA
    ======================================================== */

    preencherClientesOS();

    renderizarClientes();

    renderizarDashboard();


    /* ========================================================
       SE EXISTIR CAMPO DE CLIENTE NA OS,
       SELECIONAR AUTOMATICAMENTE
    ======================================================== */

    const select =
        $("#clienteOS");

    if (
        select &&
        clienteSelecionadoId
    ) {

        select.value =
            clienteSelecionadoId;

        atualizarDadosClienteSelecionado();

    }


    idClienteEditando =
        null;

}


/* ============================================================
   FECHAR MODAL DE CLIENTE
============================================================ */

function fecharModalCliente() {

    const modal =
        $(".modal-cliente");

    if (modal) {
        modal.remove();
    }

    idClienteEditando =
        null;
}


/* ============================================================
   EDITAR CLIENTE
============================================================ */

function editarCliente(id) {

    const cliente =
        obterCliente(id);

    if (!cliente) {

        mostrarMensagem(
            "Cliente não encontrado.",
            "erro"
        );

        return;
    }

    abrirModalCliente(
        cliente
    );
}


/* ============================================================
   EXCLUIR CLIENTE
============================================================ */

function excluirCliente(id) {

    const cliente =
        obterCliente(id);

    if (!cliente) {

        mostrarMensagem(
            "Cliente não encontrado.",
            "erro"
        );

        return;
    }


    /* ========================================================
       NÃO DEIXAR EXCLUIR CLIENTE COM OS
    ======================================================== */

    const possuiOrdens =
        ordens.some(
            ordem =>
                String(
                    ordem.clienteId
                ) ===
                String(id)
        );


    if (possuiOrdens) {

        mostrarMensagem(
            "Não é possível excluir este cliente porque ele possui Ordens de Serviço cadastradas.",
            "aviso"
        );

        return;
    }


    const confirmar =
        confirm(
            `Deseja realmente excluir o cliente "${cliente.nome}"?`
        );


    if (!confirmar) {
        return;
    }


    clientes =
        clientes.filter(
            item =>
                String(item.id) !==
                String(id)
        );


    salvarDados();


    preencherClientesOS();

    renderizarClientes();

    renderizarDashboard();


    mostrarMensagem(
        "Cliente excluído com sucesso.",
        "sucesso"
    );
}


/* ============================================================
   LISTAGEM DE CLIENTES
============================================================ */

function renderizarClientes(
    filtro = ""
) {

    const lista =
        $("#listaClientes");

    if (!lista) {
        return;
    }


    const termo =
        String(filtro || "")
            .trim()
            .toLowerCase();


    let clientesFiltrados =
        Array.isArray(clientes)
            ? [...clientes]
            : [];


    /* ========================================================
       FILTRO
    ======================================================== */

    if (termo) {

        clientesFiltrados =
            clientesFiltrados.filter(
                cliente => {

                    return (

                        String(
                            cliente.nome || ""
                        )
                            .toLowerCase()
                            .includes(termo)

                        ||

                        String(
                            cliente.telefone || ""
                        )
                            .toLowerCase()
                            .includes(termo)

                        ||

                        String(
                            cliente.email || ""
                        )
                            .toLowerCase()
                            .includes(termo)

                        ||

                        String(
                            cliente.endereco || ""
                        )
                            .toLowerCase()
                            .includes(termo)

                        ||

                        String(
                            cliente.cidade || ""
                        )
                            .toLowerCase()
                            .includes(termo)

                    );

                }
            );

    }


    /* ========================================================
       ORDENAR POR NOME
    ======================================================== */

    clientesFiltrados.sort(
        (a, b) =>
            String(
                a.nome || ""
            ).localeCompare(
                String(
                    b.nome || ""
                ),
                "pt-BR"
            )
    );


    /* ========================================================
       NENHUM CLIENTE
    ======================================================== */

    if (
        clientesFiltrados.length ===
        0
    ) {

        lista.innerHTML = `
            <div class="estado-vazio">

                <div class="estado-icone">
                    👥
                </div>

                <strong>
                    Nenhum cliente encontrado
                </strong>

                <p>
                    Cadastre um cliente para começar.
                </p>

            </div>
        `;

        return;
    }


    /* ========================================================
       CARDS DOS CLIENTES
    ======================================================== */

    lista.innerHTML =
        clientesFiltrados
            .map(cliente => {

                const quantidadeOrdens =
                    ordens.filter(
                        ordem =>
                            String(
                                ordem.clienteId
                            ) ===
                            String(
                                cliente.id
                            )
                    ).length;


                return `
                    <div class="card-cliente">

                        <div class="card-cliente-conteudo">

                            <h3>
                                ${escaparHTML(
                                    cliente.nome ||
                                    "Sem nome"
                                )}
                            </h3>

                            <p>
                                <strong>
                                    WhatsApp:
                                </strong>

                                ${
                                    cliente.telefone
                                        ? escaparHTML(
                                            formatarTelefone(
                                                cliente.telefone
                                            )
                                          )
                                        : "Não informado"
                                }
                            </p>

                            <p>
                                <strong>
                                    E-mail:
                                </strong>

                                ${
                                    cliente.email
                                        ? escaparHTML(
                                            cliente.email
                                          )
                                        : "Não informado"
                                }
                            </p>

                            <p>
                                <strong>
                                    Endereço:
                                </strong>

                                ${
                                    cliente.endereco
                                        ? escaparHTML(
                                            cliente.endereco
                                          )
                                        : "Não informado"
                                }
                            </p>

                            <p>
                                <strong>
                                    Cidade:
                                </strong>

                                ${
                                    cliente.cidade
                                        ? escaparHTML(
                                            cliente.cidade
                                          )
                                        : "Não informado"
                                }
                            </p>

                            <p>
                                <strong>
                                    Ordens:
                                </strong>

                                ${quantidadeOrdens}

                            </p>

                        </div>


                        <div class="card-acoes">

                            <button
                                type="button"
                                onclick="editarCliente('${cliente.id}')"
                            >
                                ✏️ Editar
                            </button>

                            <button
                                type="button"
                                onclick="excluirCliente('${cliente.id}')"
                            >
                                🗑️ Excluir
                            </button>

                        </div>

                    </div>
                `;

            })
            .join("");
}


/* ============================================================
   FIM CLIENTES
============================================================ */

/* ============================================================
   EQUIPAMENTOS
============================================================ */

function atualizarCadastroEquipamento(ordem) {
    if (!ordem) {
        return;
    }

    const serial = String(
        ordem.numeroSerie || ""
    ).trim().toLowerCase();

    const placa = String(
        ordem.placaVeiculo || ""
    ).trim().toLowerCase();

    let equipamentoExistente = null;

    if (serial) {
        equipamentoExistente = equipamentos.find(
            equipamento =>
                String(equipamento.numeroSerie || "")
                    .trim()
                    .toLowerCase() === serial
        );
    }

    if (!equipamentoExistente && placa) {
        equipamentoExistente = equipamentos.find(
            equipamento =>
                String(equipamento.placaVeiculo || "")
                    .trim()
                    .toLowerCase() === placa
        );
    }

    if (!equipamentoExistente) {
        equipamentoExistente = equipamentos.find(
            equipamento =>
                String(equipamento.clienteId) ===
                    String(ordem.clienteId) &&
                String(equipamento.tipo || "")
                    .toLowerCase() ===
                    String(ordem.tipoAparelho || "")
                        .toLowerCase() &&
                String(equipamento.marca || "")
                    .toLowerCase() ===
                    String(ordem.marcaAparelho || "")
                        .toLowerCase() &&
                String(equipamento.modelo || "")
                    .toLowerCase() ===
                    String(ordem.modeloAparelho || "")
                        .toLowerCase()
        );
    }

    if (equipamentoExistente) {
        equipamentoExistente.clienteId =
            ordem.clienteId;

        equipamentoExistente.tipo =
            ordem.tipoAparelho;

        equipamentoExistente.marca =
            ordem.marcaAparelho;

        equipamentoExistente.modelo =
            ordem.modeloAparelho;

        equipamentoExistente.ano =
            ordem.anoEquipamento;

        equipamentoExistente.numeroSerie =
            ordem.numeroSerie;

        equipamentoExistente.placaVeiculo =
            ordem.placaVeiculo;

        equipamentoExistente.atualizadoEm =
            new Date().toISOString();

        equipamentoExistente.ultimaOrdem =
            ordem.numeroOS;

        return equipamentoExistente;
    }

    const novoEquipamento = {
        id: gerarId("eqp"),
        clienteId: ordem.clienteId || "",
        tipo: ordem.tipoAparelho || "",
        marca: ordem.marcaAparelho || "",
        modelo: ordem.modeloAparelho || "",
        ano: ordem.anoEquipamento || "",
        numeroSerie: ordem.numeroSerie || "",
        placaVeiculo: ordem.placaVeiculo || "",
        ultimaOrdem: ordem.numeroOS || "",
        criadoEm: new Date().toISOString()
    };

    equipamentos.push(novoEquipamento);

    return novoEquipamento;
}


function renderizarEquipamentos(filtro = "") {
    const lista = $("#listaAparelhos");

    if (!lista) {
        return;
    }

    const termo = String(filtro || "")
        .trim()
        .toLowerCase();

    const equipamentosFiltrados =
        equipamentos.filter(equipamento => {

            if (!termo) {
                return true;
            }

            return (
                String(equipamento.tipo || "")
                    .toLowerCase()
                    .includes(termo) ||
                String(equipamento.marca || "")
                    .toLowerCase()
                    .includes(termo) ||
                String(equipamento.modelo || "")
                    .toLowerCase()
                    .includes(termo) ||
                String(equipamento.numeroSerie || "")
                    .toLowerCase()
                    .includes(termo) ||
                String(equipamento.placaVeiculo || "")
                    .toLowerCase()
                    .includes(termo)
            );
        });

    if (equipamentosFiltrados.length === 0) {
        lista.innerHTML = `
            <div class="estado-vazio">
                <h3>Nenhum equipamento encontrado</h3>
                <p>
                    Os equipamentos aparecerão aqui
                    quando forem cadastrados em uma OS.
                </p>
            </div>
        `;
        return;
    }

    lista.innerHTML = equipamentosFiltrados.map(equipamento => {

        const cliente = obterCliente(
            equipamento.clienteId
        );

        return `
            <div class="card-equipamento">

                <div class="card-equipamento-conteudo">

                    <h3>
                        ${escaparHTML(
                            equipamento.tipo ||
                            "Equipamento"
                        )}
                    </h3>

                    <p>
                        <strong>Marca:</strong>
                        ${escaparHTML(
                            equipamento.marca || "-"
                        )}
                    </p>

                    <p>
                        <strong>Modelo:</strong>
                        ${escaparHTML(
                            equipamento.modelo || "-"
                        )}
                    </p>

                    <p>
                        <strong>Ano:</strong>
                        ${escaparHTML(
                            equipamento.ano || "-"
                        )}
                    </p>

                    <p>
                        <strong>Nº de série:</strong>
                        ${escaparHTML(
                            equipamento.numeroSerie || "-"
                        )}
                    </p>

                    <p>
                        <strong>Placa:</strong>
                        ${escaparHTML(
                            equipamento.placaVeiculo || "-"
                        )}
                    </p>

                    <p>
                        <strong>Cliente:</strong>
                        ${escaparHTML(
                            cliente?.nome || "Não informado"
                        )}
                    </p>

                    <p>
                        <strong>Última OS:</strong>
                        ${escaparHTML(
                            equipamento.ultimaOrdem || "-"
                        )}
                    </p>

                </div>

            </div>
        `;
    }).join("");
}


/* ============================================================
   FORMULÁRIO DA ORDEM DE SERVIÇO
============================================================ */

function limparFormularioOS() {
    const form = $("#formOrdem");

    if (form) {
        form.reset();
    }

    const campoEdicao = $("#idOrdemEdicao");

    if (campoEdicao) {
        campoEdicao.value = "";
    }

    const botao = $(
        '#formOrdem button[type="submit"]'
    );

    if (botao) {
        botao.innerHTML =
            "Cadastrar ordem de serviço";
    }

    const total = $("#totalOS");

    if (total) {
        total.textContent = formatarMoeda(0);
    }

    preencherClientesOS();

    const telefone = $("#telefoneClienteOS");
    const email = $("#emailClienteOS");

    if (telefone) {
        telefone.value = "";
    }

    if (email) {
        email.value = "";
    }
}


function calcularTotalOS() {
    const valorConserto =
        obterNumeroCampo("valorConserto");

    const valorPecas =
        obterNumeroCampo("valorPecas");

    const valorMaoObra =
        obterNumeroCampo("valorMaoObra");

    const desconto =
        obterNumeroCampo("descontoOS");

    const subtotal =
        valorConserto +
        valorPecas +
        valorMaoObra;

    const total = Math.max(
        0,
        subtotal - desconto
    );

    const campoTotal = $("#totalOS");

    if (campoTotal) {
        campoTotal.textContent =
            formatarMoeda(total);
    }

    return total;
}


function obterDadosFormularioOS() {
    const clienteId =
        $("#clienteOS")?.value || "";

    const cliente =
        obterCliente(clienteId);

    const total = calcularTotalOS();

    return {
        clienteId,

        clienteNome:
            cliente?.nome ||
            "",

        telefoneCliente:
            limparTelefone(
                $("#telefoneClienteOS")?.value || ""
            ),

        emailCliente:
            $("#emailClienteOS")?.value.trim() || "",

        tipoAparelho:
            $("#tipoAparelho")?.value.trim() || "",

        marcaAparelho:
            $("#marcaAparelho")?.value.trim() || "",

        modeloAparelho:
            $("#modeloAparelho")?.value.trim() || "",

        anoEquipamento:
            $("#anoEquipamento")?.value.trim() || "",

        numeroSerie:
            $("#numeroSerie")?.value.trim() || "",

        placaVeiculo:
            $("#placaVeiculo")?.value.trim() || "",

        defeito:
            $("#defeito")?.value.trim() || "",

        diagnostico:
            $("#diagnostico")?.value.trim() || "",

        estadoAparelho:
            $("#estadoAparelho")?.value || "",

        observacoes:
            $("#observacoesOS")?.value.trim() || "",

        descricaoServico:
            $("#descricaoServico")?.value.trim() || "",

        tecnicoResponsavel:
            $("#tecnicoResponsavel")?.value.trim() || "",

        prazo:
            $("#prazoOS")?.value.trim() || "",

        valorConserto:
            obterNumeroCampo("valorConserto"),

        valorPecas:
            obterNumeroCampo("valorPecas"),

        valorMaoObra:
            obterNumeroCampo("valorMaoObra"),

        desconto:
            obterNumeroCampo("descontoOS"),

        total,

        formaPagamento:
            $("#formaPagamento")?.value || "",

        statusPagamento:
            $("#statusPagamento")?.value || "",

        garantia:
            $("#garantiaOS")?.value.trim() || ""
    };
}


/* ============================================================
   CAMPOS DE VALOR
============================================================ */

function configurarCamposValores() {
    const campos = [
        "#valorConserto",
        "#valorPecas",
        "#valorMaoObra",
        "#descontoOS"
    ];

    campos.forEach(seletor => {
        const campo = $(seletor);

        if (!campo) {
            return;
        }

        campo.addEventListener(
            "input",
            calcularTotalOS
        );

        campo.addEventListener(
            "change",
            calcularTotalOS
        );
    });
}


/* ============================================================
   FIM DA PARTE 2
============================================================ *//* ============================================================
   TECH MM
   SCRIPT PRINCIPAL
   PARTE 3/5
   ORDENS DE SERVIÇO
============================================================ */


/* ============================================================
   NÚMERO DA ORDEM DE SERVIÇO
============================================================ */

function gerarNumeroOS() {
    let maiorNumero = 0;

    ordens.forEach(ordem => {
        const numero = String(
            ordem.numeroOS || ""
        );

        const encontrado =
            numero.match(/\d+/);

        if (encontrado) {
            const valor =
                parseInt(encontrado[0], 10);

            if (valor > maiorNumero) {
                maiorNumero = valor;
            }
        }
    });

    const proximoNumero =
        maiorNumero + 1;

    return `OS-${String(proximoNumero).padStart(5, "0")}`;
}


/* ============================================================
   ID DE EDIÇÃO
============================================================ */

function garantirCampoEdicao() {
    const form = $("#formOrdem");

    if (!form) {
        return null;
    }

    let campo = $("#idOrdemEdicao");

    if (!campo) {
        campo = document.createElement("input");

        campo.type = "hidden";
        campo.id = "idOrdemEdicao";
        campo.name = "idOrdemEdicao";

        form.appendChild(campo);
    }

    return campo;
}


/* ============================================================
   SALVAR ORDEM DE SERVIÇO
============================================================ */

function salvarOrdem(evento) {
    if (evento) {
        evento.preventDefault();
    }

    const dados =
        obterDadosFormularioOS();

    if (!dados.clienteId) {
        mostrarMensagem(
            "Selecione um cliente.",
            "erro"
        );
        return;
    }

    if (!dados.tipoAparelho) {
        mostrarMensagem(
            "Informe o tipo do equipamento ou veículo.",
            "erro"
        );
        return;
    }

    if (!dados.defeito) {
        mostrarMensagem(
            "Informe o defeito ou problema apresentado.",
            "erro"
        );
        return;
    }

    const campoEdicao =
        garantirCampoEdicao();

    const idEdicao =
        campoEdicao?.value || "";

    const agora =
        new Date().toISOString();

    if (idEdicao) {
        const indice =
            ordens.findIndex(
                ordem =>
                    String(ordem.id) ===
                    String(idEdicao)
            );

        if (indice === -1) {
            mostrarMensagem(
                "Ordem de serviço não encontrada.",
                "erro"
            );
            return;
        }

        const ordemAtual =
            ordens[indice];

        const ordemAtualizada = {
            ...ordemAtual,
            ...dados,
            atualizadoEm: agora
        };

        ordens[indice] =
            ordemAtualizada;

        atualizarCadastroEquipamento(
            ordemAtualizada
        );

        salvarDados();

        atualizarTudo();

        limparFormularioOS();

        mostrarSecao("ordens");

        mostrarMensagem(
            `Ordem ${ordemAtualizada.numeroOS} atualizada com sucesso.`,
            "sucesso"
        );

        return;
    }

    const novaOrdem = {
        id: gerarId("os"),

        numeroOS:
            gerarNumeroOS(),

        status:
            STATUS_OS.ABERTA,

        criadoEm: agora,
        atualizadoEm: agora,

        ...dados
    };

    ordens.push(novaOrdem);

    atualizarCadastroEquipamento(
        novaOrdem
    );

    salvarDados();

    atualizarTudo();

    limparFormularioOS();

    mostrarSecao("ordens");

    mostrarMensagem(
        `Ordem ${novaOrdem.numeroOS} cadastrada com sucesso.`,
        "sucesso"
    );
}


/* ============================================================
   EDITAR ORDEM
============================================================ */

function editarOrdem(id) {
    const ordem =
        ordens.find(
            item =>
                String(item.id) ===
                String(id)
        );

    if (!ordem) {
        mostrarMensagem(
            "Ordem de serviço não encontrada.",
            "erro"
        );
        return;
    }

    const campoEdicao =
        garantirCampoEdicao();

    if (campoEdicao) {
        campoEdicao.value =
            ordem.id;
    }

    preencherClientesOS();

    const campos = {
        clienteOS:
            ordem.clienteId,

        telefoneClienteOS:
            ordem.telefoneCliente || "",

        emailClienteOS:
            ordem.emailCliente || "",

        tipoAparelho:
            ordem.tipoAparelho || "",

        marcaAparelho:
            ordem.marcaAparelho || "",

        modeloAparelho:
            ordem.modeloAparelho || "",

        anoEquipamento:
            ordem.anoEquipamento || "",

        numeroSerie:
            ordem.numeroSerie || "",

        placaVeiculo:
            ordem.placaVeiculo || "",

        defeito:
            ordem.defeito || "",

        diagnostico:
            ordem.diagnostico || "",

        estadoAparelho:
            ordem.estadoAparelho || "",

        observacoesOS:
            ordem.observacoes || "",

        descricaoServico:
            ordem.descricaoServico || "",

        tecnicoResponsavel:
            ordem.tecnicoResponsavel || "",

        prazoOS:
            ordem.prazo || "",

        valorConserto:
            ordem.valorConserto || 0,

        valorPecas:
            ordem.valorPecas || 0,

        valorMaoObra:
            ordem.valorMaoObra || 0,

        descontoOS:
            ordem.desconto || 0,

        formaPagamento:
            ordem.formaPagamento || "",

        statusPagamento:
            ordem.statusPagamento || "",

        garantiaOS:
            ordem.garantia || ""
    };

    Object.entries(campos).forEach(
        ([id, valor]) => {

            const campo =
                document.getElementById(id);

            if (!campo) {
                return;
            }

            campo.value =
                valor;
        }
    );

    atualizarDadosClienteSelecionado();

    calcularTotalOS();

    const botao = $(
        '#formOrdem button[type="submit"]'
    );

    if (botao) {
        botao.innerHTML =
            "Salvar alterações";
    }

    mostrarSecao("novaOrdem");

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

    mostrarMensagem(
        `Editando ${ordem.numeroOS}.`,
        "info"
    );
}


/* ============================================================
   EXCLUIR ORDEM
============================================================ */

function excluirOrdem(id) {
    const ordem =
        ordens.find(
            item =>
                String(item.id) ===
                String(id)
        );

    if (!ordem) {
        mostrarMensagem(
            "Ordem de serviço não encontrada.",
            "erro"
        );
        return;
    }

    const confirmar =
        confirm(
            `Deseja realmente excluir a ordem ${ordem.numeroOS}?`
        );

    if (!confirmar) {
        return;
    }

    ordens =
        ordens.filter(
            item =>
                String(item.id) !==
                String(id)
        );

    salvarDados();

    atualizarTudo();

    mostrarMensagem(
        `Ordem ${ordem.numeroOS} excluída.`,
        "sucesso"
    );
}


/* ============================================================
   ALTERAR STATUS DA ORDEM
============================================================ */

function alterarStatusOrdem(
    id,
    novoStatus
) {
    const ordem =
        ordens.find(
            item =>
                String(item.id) ===
                String(id)
        );

    if (!ordem) {
        mostrarMensagem(
            "Ordem não encontrada.",
            "erro"
        );
        return;
    }

    if (
        !Object.prototype.hasOwnProperty.call(
            STATUS_NOMES,
            novoStatus
        )
    ) {
        mostrarMensagem(
            "Status inválido.",
            "erro"
        );
        return;
    }

    ordem.status =
        novoStatus;

    ordem.atualizadoEm =
        new Date().toISOString();

    if (
        novoStatus ===
        STATUS_OS.ENTREGUE
    ) {
        ordem.entregueEm =
            new Date().toISOString();
    }

    salvarDados();

    atualizarTudo();

    mostrarMensagem(
        `${ordem.numeroOS}: status alterado para "${obterNomeStatus(novoStatus)}".`,
        "sucesso"
    );
}


/* ============================================================
   FILTRO DE ORDENS
============================================================ */

function configurarFiltrosOrdens() {
    $$(".filtro").forEach(botao => {

        botao.addEventListener(
            "click",
            () => {

                $$(".filtro").forEach(
                    item =>
                        item.classList.remove(
                            "ativo"
                        )
                );

                botao.classList.add(
                    "ativo"
                );

                filtroOrdemAtual =
                    botao.dataset.filtro ||
                    "todas";

                renderizarOrdens();
            }
        );
    });
}


/* ============================================================
   BUSCA DE ORDENS
============================================================ */

function buscarOrdens(termo = "") {
    const texto =
        String(termo || "")
            .trim()
            .toLowerCase();

    let resultado =
        [...ordens];

    if (
        filtroOrdemAtual !==
        "todas"
    ) {
        resultado =
            resultado.filter(
                ordem =>
                    ordem.status ===
                    filtroOrdemAtual
            );
    }

    if (texto) {
        resultado =
            resultado.filter(ordem => {

                const cliente =
                    obterCliente(
                        ordem.clienteId
                    );

                return (
                    String(
                        ordem.numeroOS || ""
                    )
                        .toLowerCase()
                        .includes(texto) ||

                    String(
                        cliente?.nome || ""
                    )
                        .toLowerCase()
                        .includes(texto) ||

                    String(
                        ordem.tipoAparelho || ""
                    )
                        .toLowerCase()
                        .includes(texto) ||

                    String(
                        ordem.marcaAparelho || ""
                    )
                        .toLowerCase()
                        .includes(texto) ||

                    String(
                        ordem.modeloAparelho || ""
                    )
                        .toLowerCase()
                        .includes(texto) ||

                    String(
                        ordem.placaVeiculo || ""
                    )
                        .toLowerCase()
                        .includes(texto)
                );
            });
    }

    return resultado;
}


/* ============================================================
   CARD DA ORDEM
============================================================ */

function criarCardOrdem(ordem) {
    const cliente =
        obterCliente(
            ordem.clienteId
        );

    const status =
        ordem.status ||
        STATUS_OS.ABERTA;

    const tipo =
        ordem.tipoAparelho ||
        "Equipamento";

    const equipamento =
        [
            ordem.marcaAparelho,
            ordem.modeloAparelho
        ]
            .filter(Boolean)
            .join(" ");

    return `
        <div class="card-ordem">

            <div class="card-ordem-topo">

                <div>
                    <h3>
                        ${escaparHTML(
                            ordem.numeroOS ||
                            "Sem número"
                        )}
                    </h3>

                    <span class="badge-status ${obterClasseStatus(status)}">
                        ${escaparHTML(
                            obterNomeStatus(status)
                        )}
                    </span>
                </div>

                <div class="card-ordem-valor">
                    ${formatarMoeda(
                        ordem.total || 0
                    )}
                </div>

            </div>

            <div class="card-ordem-info">

                <p>
                    <strong>Cliente:</strong>
                    ${escaparHTML(
                        cliente?.nome ||
                        ordem.clienteNome ||
                        "Não informado"
                    )}
                </p>

                <p>
                    <strong>Equipamento:</strong>
                    ${escaparHTML(tipo)}
                    ${equipamento
                        ? ` - ${escaparHTML(equipamento)}`
                        : ""}
                </p>

                ${
                    ordem.numeroSerie
                        ? `
                            <p>
                                <strong>Nº de série:</strong>
                                ${escaparHTML(
                                    ordem.numeroSerie
                                )}
                            </p>
                          `
                        : ""
                }

                ${
                    ordem.placaVeiculo
                        ? `
                            <p>
                                <strong>Placa:</strong>
                                ${escaparHTML(
                                    ordem.placaVeiculo
                                )}
                            </p>
                          `
                        : ""
                }

                <p>
                    <strong>Entrada:</strong>
                    ${formatarDataHora(
                        ordem.criadoEm
                    )}
                </p>

            </div>

            <div class="card-ordem-status">

                <label>
                    Alterar status:
                </label>

                <select
                    onchange="alterarStatusOrdem('${ordem.id}', this.value)"
                >
                    ${Object.entries(STATUS_NOMES)
                        .map(
                            ([valor, nome]) =>
                                `
                                <option
                                    value="${valor}"
                                    ${
                                        status === valor
                                            ? "selected"
                                            : ""
                                    }
                                >
                                    ${nome}
                                </option>
                                `
                        )
                        .join("")}
                </select>

            </div>

            <div class="card-acoes">

                <button
                    type="button"
                    onclick="visualizarOrdem('${ordem.id}')"
                >
                    Ver
                </button>

                <button
                    type="button"
                    onclick="editarOrdem('${ordem.id}')"
                >
                    Editar
                </button>

                <button
                    type="button"
                    onclick="avisarCliente('${ordem.id}', 'status')"
                >
                    WhatsApp
                </button>

                <button
                    type="button"
                    onclick="imprimirOrdem('${ordem.id}')"
                >
                    Imprimir
                </button>

                <button
                    type="button"
                    onclick="excluirOrdem('${ordem.id}')"
                >
                    Excluir
                </button>

            </div>

        </div>
    `;
}


/* ============================================================
   RENDERIZAR ORDENS
============================================================ */

function renderizarOrdens() {
    const lista =
        $("#listaOrdens");

    if (!lista) {
        return;
    }

    const campoBusca =
        $("#buscarOrdem");

    const termo =
        campoBusca?.value || "";

    const resultado =
        buscarOrdens(termo);

    if (resultado.length === 0) {
        lista.innerHTML = `
            <div class="estado-vazio">

                <h3>
                    Nenhuma ordem encontrada
                </h3>

                <p>
                    Não existem ordens que correspondam
                    aos filtros selecionados.
                </p>

            </div>
        `;

        return;
    }

    resultado.sort(
        (a, b) =>
            new Date(
                b.criadoEm || 0
            ) -
            new Date(
                a.criadoEm || 0
            )
    );

    lista.innerHTML =
        resultado
            .map(criarCardOrdem)
            .join("");
}


/* ============================================================
   VISUALIZAR ORDEM
============================================================ */

function visualizarOrdem(id) {
    const ordem =
        ordens.find(
            item =>
                String(item.id) ===
                String(id)
        );

    if (!ordem) {
        mostrarMensagem(
            "Ordem não encontrada.",
            "erro"
        );
        return;
    }

    const modal =
        criarModalVisualizacaoOS(
            ordem
        );

    document.body.appendChild(
        modal
    );
}


function criarModalVisualizacaoOS(ordem) {
    const cliente =
        obterCliente(
            ordem.clienteId
        );

    const modal =
        document.createElement("div");

    modal.className =
        "modal-os";

    modal.innerHTML = `
        <div class="modal-conteudo">

            <div class="modal-cabecalho">

                <div>
                    <h2>
                        Ordem ${escaparHTML(
                            ordem.numeroOS
                        )}
                    </h2>

                    <span class="badge-status ${obterClasseStatus(ordem.status)}">
                        ${escaparHTML(
                            obterNomeStatus(
                                ordem.status
                            )
                        )}
                    </span>
                </div>

                <button
                    type="button"
                    class="btn-fechar-modal"
                    onclick="fecharModalOS()"
                >
                    ×
                </button>

            </div>

            <div class="visualizacao-os">

                <section>
                    <h3>Cliente</h3>

                    <p>
                        <strong>Nome:</strong>
                        ${escaparHTML(
                            cliente?.nome ||
                            ordem.clienteNome ||
                            "-"
                        )}
                    </p>

                    <p>
                        <strong>Telefone:</strong>
                        ${
                            ordem.telefoneCliente
                                ? escaparHTML(
                                    formatarTelefone(
                                        ordem.telefoneCliente
                                    )
                                  )
                                : "-"
                        }
                    </p>

                    <p>
                        <strong>E-mail:</strong>
                        ${escaparHTML(
                            ordem.emailCliente ||
                            cliente?.email ||
                            "-"
                        )}
                    </p>
                </section>

                <section>
                    <h3>Equipamento / Veículo</h3>

                    <p>
                        <strong>Tipo:</strong>
                        ${escaparHTML(
                            ordem.tipoAparelho ||
                            "-"
                        )}
                    </p>

                    <p>
                        <strong>Marca:</strong>
                        ${escaparHTML(
                            ordem.marcaAparelho ||
                            "-"
                        )}
                    </p>

                    <p>
                        <strong>Modelo:</strong>
                        ${escaparHTML(
                            ordem.modeloAparelho ||
                            "-"
                        )}
                    </p>

                    <p>
                        <strong>Ano:</strong>
                        ${escaparHTML(
                            ordem.anoEquipamento ||
                            "-"
                        )}
                    </p>

                    <p>
                        <strong>Nº de série:</strong>
                        ${escaparHTML(
                            ordem.numeroSerie ||
                            "-"
                        )}
                    </p>

                    <p>
                        <strong>Placa:</strong>
                        ${escaparHTML(
                            ordem.placaVeiculo ||
                            "-"
                        )}
                    </p>
                </section>

                <section>
                    <h3>Problema</h3>

                    <p>
                        <strong>Defeito:</strong><br>
                        ${escaparHTML(
                            ordem.defeito ||
                            "-"
                        )}
                    </p>

                    <p>
                        <strong>Diagnóstico:</strong><br>
                        ${escaparHTML(
                            ordem.diagnostico ||
                            "-"
                        )}
                    </p>

                    <p>
                        <strong>Estado:</strong><br>
                        ${escaparHTML(
                            ordem.estadoAparelho ||
                            "-"
                        )}
                    </p>

                    <p>
                        <strong>Observações:</strong><br>
                        ${escaparHTML(
                            ordem.observacoes ||
                            "-"
                        )}
                    </p>
                </section>

                <section>
                    <h3>Serviço</h3>

                    <p>
                        <strong>Descrição:</strong><br>
                        ${escaparHTML(
                            ordem.descricaoServico ||
                            "-"
                        )}
                    </p>

                    <p>
                        <strong>Técnico:</strong>
                        ${escaparHTML(
                            ordem.tecnicoResponsavel ||
                            "-"
                        )}
                    </p>

                    <p>
                        <strong>Prazo:</strong>
                        ${escaparHTML(
                            ordem.prazo ||
                            "-"
                        )}
                    </p>

                    <p>
                        <strong>Garantia:</strong>
                        ${escaparHTML(
                            ordem.garantia ||
                            "-"
                        )}
                    </p>
                </section>

                <section>
                    <h3>Valores</h3>

                    <p>
                        <strong>Conserto:</strong>
                        ${formatarMoeda(
                            ordem.valorConserto || 0
                        )}
                    </p>

                    <p>
                        <strong>Peças:</strong>
                        ${formatarMoeda(
                            ordem.valorPecas || 0
                        )}
                    </p>

                    <p>
                        <strong>Mão de obra:</strong>
                        ${formatarMoeda(
                            ordem.valorMaoObra || 0
                        )}
                    </p>

                    <p>
                        <strong>Desconto:</strong>
                        ${formatarMoeda(
                            ordem.desconto || 0
                        )}
                    </p>

                    <p class="valor-total">
                        <strong>Total:</strong>
                        ${formatarMoeda(
                            ordem.total || 0
                        )}
                    </p>
                </section>

                <section>
                    <h3>Pagamento</h3>

                    <p>
                        <strong>Forma:</strong>
                        ${escaparHTML(
                            ordem.formaPagamento ||
                            "-"
                        )}
                    </p>

                    <p>
                        <strong>Status:</strong>
                        ${escaparHTML(
                            ordem.statusPagamento ||
                            "-"
                        )}
                    </p>
                </section>

            </div>

            <div class="modal-acoes">

                <button
                    type="button"
                    onclick="editarOrdem('${ordem.id}'); fecharModalOS();"
                >
                    Editar
                </button>

                <button
                    type="button"
                    onclick="imprimirOrdem('${ordem.id}')"
                >
                    Imprimir
                </button>

                <button
                    type="button"
                    onclick="avisarCliente('${ordem.id}', 'status')"
                >
                    WhatsApp
                </button>

                <button
                    type="button"
                    onclick="fecharModalOS()"
                >
                    Fechar
                </button>

            </div>

        </div>
    `;

    return modal;
}


function fecharModalOS() {
    const modal =
        $(".modal-os");

    if (modal) {
        modal.remove();
    }
}


/* ============================================================
   FUNÇÕES GLOBAIS DESTA PARTE
============================================================ */

window.salvarOrdem = salvarOrdem;
window.limparFormularioOS = limparFormularioOS;
window.editarOrdem = editarOrdem;
window.excluirOrdem = excluirOrdem;
window.alterarStatusOrdem = alterarStatusOrdem;
window.visualizarOrdem = visualizarOrdem;
window.fecharModalOS = fecharModalOS;
window.editarCliente = editarCliente;
window.excluirCliente = excluirCliente;
window.abrirModalCliente = abrirModalCliente;
window.fecharModalCliente = fecharModalCliente;


/* ============================================================
   FIM DA PARTE 3
============================================================ *//* ============================================================
   TECH MM
   SCRIPT PRINCIPAL
   PARTE 4/5
   FINANCEIRO + WHATSAPP + IMPRESSÃO
============================================================ */


/* ============================================================
   FINANCEIRO
============================================================ */

function pagamentoFoiRecebido(ordem) {
    const status = String(
        ordem?.statusPagamento || ""
    ).toLowerCase();

    return (
        status.includes("pago") ||
        status.includes("recebido") ||
        status.includes("quitado")
    );
}


function atualizarFinanceiroDaOrdem(
    ordem,
    idEdicao = null
) {
    if (!ordem) {
        return;
    }

    const identificador =
        idEdicao || ordem.id;

    financeiro =
        financeiro.filter(
            movimento =>
                String(movimento.ordemId) !==
                String(identificador)
        );

    const valor =
        converterNumero(ordem.total);

    if (valor <= 0) {
        return;
    }

    financeiro.push({
        id: gerarId("fin"),
        ordemId: ordem.id,
        numeroOS: ordem.numeroOS,
        clienteId: ordem.clienteId,
        clienteNome: ordem.clienteNome,
        valor,
        tipo: pagamentoFoiRecebido(ordem)
            ? "recebido"
            : "a_receber",
        formaPagamento:
            ordem.formaPagamento || "",
        statusPagamento:
            ordem.statusPagamento || "",
        descricao:
            `Serviço ${ordem.numeroOS}`,
        data:
            ordem.atualizadoEm ||
            ordem.criadoEm ||
            new Date().toISOString()
    });
}


function reconstruirFinanceiro() {
    financeiro = [];

    ordens.forEach(ordem => {
        atualizarFinanceiroDaOrdem(
            ordem
        );
    });

    salvarStorage(
        CHAVE_FINANCEIRO,
        financeiro
    );
}


/* ============================================================
   RENDERIZAR FINANCEIRO
============================================================ */

function renderizarFinanceiro() {
    const totalRecebido =
        ordens
            .filter(pagamentoFoiRecebido)
            .reduce(
                (soma, ordem) =>
                    soma +
                    converterNumero(
                        ordem.total
                    ),
                0
            );

    const totalReceber =
        ordens
            .filter(
                ordem =>
                    !pagamentoFoiRecebido(
                        ordem
                    ) &&
                    ordem.status !==
                        STATUS_OS.ENTREGUE
            )
            .reduce(
                (soma, ordem) =>
                    soma +
                    converterNumero(
                        ordem.total
                    ),
                0
            );

    const totalServicos =
        ordens.reduce(
            (soma, ordem) =>
                soma +
                converterNumero(
                    ordem.total
                ),
            0
        );

    const campoRecebido =
        $("#totalRecebido");

    const campoReceber =
        $("#totalReceber");

    const campoServicos =
        $("#totalServicos");

    if (campoRecebido) {
        campoRecebido.textContent =
            formatarMoeda(
                totalRecebido
            );
    }

    if (campoReceber) {
        campoReceber.textContent =
            formatarMoeda(
                totalReceber
            );
    }

    if (campoServicos) {
        campoServicos.textContent =
            formatarMoeda(
                totalServicos
            );
    }

    const lista =
        $("#movimentacoesFinanceiras");

    if (!lista) {
        return;
    }

    const movimentos =
        [...ordens]
            .sort(
                (a, b) =>
                    new Date(
                        b.atualizadoEm ||
                        b.criadoEm ||
                        0
                    ) -
                    new Date(
                        a.atualizadoEm ||
                        a.criadoEm ||
                        0
                    )
            );

    if (movimentos.length === 0) {
        lista.innerHTML = `
            <div class="estado-vazio">
                <h3>Nenhuma movimentação</h3>
                <p>
                    As movimentações financeiras
                    aparecerão aqui.
                </p>
            </div>
        `;

        return;
    }

    lista.innerHTML =
        movimentos.map(ordem => {

            const recebido =
                pagamentoFoiRecebido(
                    ordem
                );

            return `
                <div class="movimentacao-financeira">

                    <div>
                        <strong>
                            ${escaparHTML(
                                ordem.numeroOS ||
                                "-"
                            )}
                        </strong>

                        <p>
                            ${escaparHTML(
                                ordem.clienteNome ||
                                obterCliente(
                                    ordem.clienteId
                                )?.nome ||
                                "Cliente não informado"
                            )}
                        </p>

                        <small>
                            ${formatarDataHora(
                                ordem.atualizadoEm ||
                                ordem.criadoEm
                            )}
                        </small>
                    </div>

                    <div>
                        <strong>
                            ${formatarMoeda(
                                ordem.total || 0
                            )}
                        </strong>

                        <p>
                            ${escaparHTML(
                                ordem.formaPagamento ||
                                "Pagamento não informado"
                            )}
                        </p>

                        <span class="${
                            recebido
                                ? "financeiro-recebido"
                                : "financeiro-pendente"
                        }">
                            ${
                                recebido
                                    ? "Recebido"
                                    : "A receber"
                            }
                        </span>
                    </div>

                </div>
            `;
        }).join("");
}


/* ============================================================
   MENSAGEM DO WHATSAPP
============================================================ */

function gerarMensagemWhatsApp(
    ordem,
    tipo = "status"
) {
    if (!ordem) {
        return "";
    }

    const cliente =
        obterCliente(
            ordem.clienteId
        );

    const nomeCliente =
        ordem.clienteNome ||
        cliente?.nome ||
        "Cliente";

    const status =
        ordem.status ||
        STATUS_OS.ABERTA;

    const equipamento =
        [
            ordem.tipoAparelho,
            ordem.marcaAparelho,
            ordem.modeloAparelho
        ]
            .filter(Boolean)
            .join(" ");

    let mensagem = "";

    if (tipo === "abertura") {

        mensagem =
`Olá, ${nomeCliente}! 👋

Aqui é da TECH MM.

Sua Ordem de Serviço foi cadastrada com sucesso.

🔧 *ORDEM DE SERVIÇO*
Número: *${ordem.numeroOS}*

📱 Equipamento/Veículo:
${equipamento || "Não informado"}

⚠️ Problema:
${ordem.defeito || "Não informado"}

📋 Status:
*${obterNomeStatus(status)}*

💰 Valor:
*${formatarMoeda(ordem.total || 0)}*

Assim que tivermos novidades sobre o serviço, entraremos em contato.

Obrigado pela preferência!`;
    }

    else if (
        tipo === "pronto" ||
        status === STATUS_OS.PRONTO
    ) {

        mensagem =
`Olá, ${nomeCliente}! 👋

Aqui é da TECH MM.

Temos uma novidade sobre sua Ordem de Serviço.

🔧 *ORDEM ${ordem.numeroOS}*

📱 Equipamento/Veículo:
${equipamento || "Não informado"}

✅ *SEU EQUIPAMENTO ESTÁ PRONTO!*

💰 Valor total:
*${formatarMoeda(ordem.total || 0)}*

Forma de pagamento:
${ordem.formaPagamento || "A combinar"}

📌 Status:
*Pronto para retirada.*

Entre em contato conosco para combinar a retirada.

Obrigado pela preferência!`;
    }

    else {

        mensagem =
`Olá, ${nomeCliente}! 👋

Aqui é da TECH MM.

Temos uma atualização sobre sua Ordem de Serviço.

🔧 *ORDEM ${ordem.numeroOS}*

📱 Equipamento/Veículo:
${equipamento || "Não informado"}

📋 Novo status:
*${obterNomeStatus(status)}*

💰 Valor atual:
*${formatarMoeda(ordem.total || 0)}*

${ordem.prazo
    ? `⏱️ Prazo: ${ordem.prazo}`
    : ""}

Qualquer novidade, entraremos em contato.

Obrigado pela preferência!`;
    }

    return mensagem;
}


/* ============================================================
   ABRIR WHATSAPP
============================================================ */

function abrirWhatsApp(
    telefone,
    mensagem
) {
    let numero =
        limparTelefone(
            telefone
        );

    if (!numero) {
        mostrarMensagem(
            "O cliente não possui telefone cadastrado.",
            "aviso"
        );
        return;
    }

    if (
        numero.length === 10 ||
        numero.length === 11
    ) {
        numero =
            "55" + numero;
    }

    const url =
        `https://wa.me/${numero}?text=${encodeURIComponent(
            mensagem
        )}`;

    window.open(
        url,
        "_blank"
    );
}


/* ============================================================
   AVISAR CLIENTE
============================================================ */

function avisarCliente(
    id,
    tipo = "status"
) {
    const ordem =
        ordens.find(
            item =>
                String(item.id) ===
                String(id)
        );

    if (!ordem) {
        mostrarMensagem(
            "Ordem não encontrada.",
            "erro"
        );
        return;
    }

    const cliente =
        obterCliente(
            ordem.clienteId
        );

    const telefone =
        ordem.telefoneCliente ||
        cliente?.telefone ||
        "";

    if (!telefone) {
        mostrarMensagem(
            "O cliente não possui WhatsApp/telefone cadastrado.",
            "aviso"
        );
        return;
    }

    const mensagem =
        gerarMensagemWhatsApp(
            ordem,
            tipo
        );

    abrirWhatsApp(
        telefone,
        mensagem
    );
}


function avisarClientePronto(id) {
    avisarCliente(
        id,
        "pronto"
    );
}


/* ============================================================
   IMPRESSÃO DA ORDEM
============================================================ */

function imprimirOrdem(id) {
    const ordem =
        ordens.find(
            item =>
                String(item.id) ===
                String(id)
        );

    if (!ordem) {
        mostrarMensagem(
            "Ordem não encontrada.",
            "erro"
        );
        return;
    }

    const cliente =
        obterCliente(
            ordem.clienteId
        );

    const janela =
        window.open(
            "",
            "_blank",
            "width=900,height=700"
        );

    if (!janela) {
        mostrarMensagem(
            "O navegador bloqueou a janela de impressão.",
            "aviso"
        );
        return;
    }

    const equipamento =
        [
            ordem.tipoAparelho,
            ordem.marcaAparelho,
            ordem.modeloAparelho
        ]
            .filter(Boolean)
            .join(" ");

    janela.document.write(`
        <!DOCTYPE html>
        <html lang="pt-BR">

        <head>

            <meta charset="UTF-8">

            <title>
                ${escaparHTML(
                    ordem.numeroOS
                )} - TECH MM
            </title>

            <style>

                * {
                    box-sizing: border-box;
                }

                body {
                    font-family: Arial, sans-serif;
                    margin: 0;
                    padding: 30px;
                    color: #111;
                    background: #fff;
                }

                .cabecalho {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    border-bottom: 2px solid #111;
                    padding-bottom: 15px;
                    margin-bottom: 20px;
                }

                h1 {
                    margin: 0 0 5px;
                    font-size: 25px;
                }

                h2 {
                    margin: 0;
                    font-size: 20px;
                }

                h3 {
                    border-bottom: 1px solid #ccc;
                    padding-bottom: 6px;
                    margin-top: 22px;
                }

                p {
                    margin: 7px 0;
                    line-height: 1.4;
                }

                .grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 20px;
                }

                .total {
                    font-size: 22px;
                    font-weight: bold;
                    margin-top: 15px;
                    padding: 12px;
                    border: 2px solid #111;
                }

                .rodape {
                    margin-top: 35px;
                    padding-top: 15px;
                    border-top: 1px solid #ccc;
                    text-align: center;
                    font-size: 12px;
                }

                @media print {
                    body {
                        padding: 10px;
                    }
                }

            </style>

        </head>

        <body>

            <div class="cabecalho">

                <div>
                    <h1>TECH MM</h1>
                    <p>
                        Sistema de Serviços e Consertos
                    </p>
                </div>

                <div>
                    <h2>
                        ${escaparHTML(
                            ordem.numeroOS
                        )}
                    </h2>

                    <p>
                        Status:
                        <strong>
                            ${escaparHTML(
                                obterNomeStatus(
                                    ordem.status
                                )
                            )}
                        </strong>
                    </p>

                    <p>
                        Entrada:
                        ${formatarDataHora(
                            ordem.criadoEm
                        )}
                    </p>
                </div>

            </div>

            <div class="grid">

                <div>

                    <h3>Cliente</h3>

                    <p>
                        <strong>Nome:</strong>
                        ${escaparHTML(
                            cliente?.nome ||
                            ordem.clienteNome ||
                            "-"
                        )}
                    </p>

                    <p>
                        <strong>Telefone:</strong>
                        ${escaparHTML(
                            ordem.telefoneCliente
                                ? formatarTelefone(
                                    ordem.telefoneCliente
                                  )
                                : "-"
                        )}
                    </p>

                    <p>
                        <strong>E-mail:</strong>
                        ${escaparHTML(
                            ordem.emailCliente ||
                            cliente?.email ||
                            "-"
                        )}
                    </p>

                </div>

                <div>

                    <h3>Equipamento / Veículo</h3>

                    <p>
                        <strong>Tipo:</strong>
                        ${escaparHTML(
                            ordem.tipoAparelho ||
                            "-"
                        )}
                    </p>

                    <p>
                        <strong>Equipamento:</strong>
                        ${escaparHTML(
                            equipamento ||
                            "-"
                        )}
                    </p>

                    <p>
                        <strong>Ano:</strong>
                        ${escaparHTML(
                            ordem.anoEquipamento ||
                            "-"
                        )}
                    </p>

                    <p>
                        <strong>Nº de série:</strong>
                        ${escaparHTML(
                            ordem.numeroSerie ||
                            "-"
                        )}
                    </p>

                    <p>
                        <strong>Placa:</strong>
                        ${escaparHTML(
                            ordem.placaVeiculo ||
                            "-"
                        )}
                    </p>

                </div>

            </div>

            <h3>Problema relatado</h3>

            <p>
                ${escaparHTML(
                    ordem.defeito ||
                    "-"
                )}
            </p>

            <h3>Diagnóstico</h3>

            <p>
                ${escaparHTML(
                    ordem.diagnostico ||
                    "-"
                )}
            </p>

            <h3>Serviço realizado / previsto</h3>

            <p>
                ${escaparHTML(
                    ordem.descricaoServico ||
                    "-"
                )}
            </p>

            <h3>Observações</h3>

            <p>
                ${escaparHTML(
                    ordem.observacoes ||
                    "-"
                )}
            </p>

            <div class="grid">

                <div>

                    <h3>Pagamento</h3>

                    <p>
                        <strong>Forma:</strong>
                        ${escaparHTML(
                            ordem.formaPagamento ||
                            "-"
                        )}
                    </p>

                    <p>
                        <strong>Status:</strong>
                        ${escaparHTML(
                            ordem.statusPagamento ||
                            "-"
                        )}
                    </p>

                    <p>
                        <strong>Garantia:</strong>
                        ${escaparHTML(
                            ordem.garantia ||
                            "-"
                        )}
                    </p>

                </div>

                <div>

                    <h3>Valores</h3>

                    <p>
                        Conserto:
                        ${formatarMoeda(
                            ordem.valorConserto || 0
                        )}
                    </p>

                    <p>
                        Peças:
                        ${formatarMoeda(
                            ordem.valorPecas || 0
                        )}
                    </p>

                    <p>
                        Mão de obra:
                        ${formatarMoeda(
                            ordem.valorMaoObra || 0
                        )}
                    </p>

                    <p>
                        Desconto:
                        ${formatarMoeda(
                            ordem.desconto || 0
                        )}
                    </p>

                    <div class="total">
                        TOTAL:
                        ${formatarMoeda(
                            ordem.total || 0
                        )}
                    </div>

                </div>

            </div>

            <div class="rodape">
                TECH MM — Sistema de Serviços e Consertos
            </div>

            <script>
                window.onload = function() {
                    window.print();
                };
            <\/script>

        </body>

        </html>
    `);

    janela.document.close();
}


/* ============================================================
   FUNÇÕES GLOBAIS
============================================================ */

window.avisarCliente =
    avisarCliente;

window.avisarClientePronto =
    avisarClientePronto;

window.abrirWhatsApp =
    abrirWhatsApp;

window.gerarMensagemWhatsApp =
    gerarMensagemWhatsApp;

window.imprimirOrdem =
    imprimirOrdem;


/* ============================================================
   FIM DA PARTE 4
============================================================ *//* ============================================================
   TECH MM
   SISTEMA DE SERVIÇOS E CONSERTOS
   PARTE 5/5
   DASHBOARD + EVENTOS + INICIALIZAÇÃO
============================================================ */


/* ============================================================
   DASHBOARD
============================================================ */

function renderizarDashboard() {
    const totalOrdens =
        $("#totalOrdens");

    const totalAndamento =
        $("#totalAndamento");

    const totalPecas =
        $("#totalPecas");

    const totalProntos =
        $("#totalProntos");

    if (totalOrdens) {
        totalOrdens.textContent =
            ordens.length;
    }

    if (totalAndamento) {
        totalAndamento.textContent =
            ordens.filter(ordem =>
                ordem.status ===
                    STATUS_OS.ANDAMENTO ||
                ordem.status ===
                    STATUS_OS.ANALISE
            ).length;
    }

    if (totalPecas) {
        totalPecas.textContent =
            contarPecas();
    }

    if (totalProntos) {
        totalProntos.textContent =
            contarOrdensPorStatus(
                STATUS_OS.PRONTO
            );
    }

    renderizarOrdensRecentes();
}


/* ============================================================
   ORDENS RECENTES
============================================================ */

function renderizarOrdensRecentes() {
    const lista =
        $("#ordensRecentes");

    if (!lista) {
        return;
    }

    const recentes =
        [...ordens]
            .sort(
                (a, b) =>
                    new Date(
                        b.criadoEm || 0
                    ) -
                    new Date(
                        a.criadoEm || 0
                    )
            )
            .slice(0, 5);

    if (recentes.length === 0) {
        lista.innerHTML = `
            <div class="estado-vazio">

                <h3>
                    Nenhuma ordem cadastrada
                </h3>

                <p>
                    Cadastre sua primeira ordem
                    de serviço para começar.
                </p>

            </div>
        `;

        return;
    }

    lista.innerHTML =
        recentes.map(ordem => {

            const cliente =
                obterCliente(
                    ordem.clienteId
                );

            return `
                <div class="ordem-recente">

                    <div>

                        <strong>
                            ${escaparHTML(
                                ordem.numeroOS ||
                                "-"
                            )}
                        </strong>

                        <p>
                            ${escaparHTML(
                                cliente?.nome ||
                                ordem.clienteNome ||
                                "Cliente não informado"
                            )}
                        </p>

                    </div>

                    <div>

                        <span class="badge-status ${obterClasseStatus(ordem.status)}">
                            ${escaparHTML(
                                obterNomeStatus(
                                    ordem.status
                                )
                            )}
                        </span>

                        <strong>
                            ${formatarMoeda(
                                ordem.total || 0
                            )}
                        </strong>

                    </div>

                </div>
            `;
        }).join("");
}


/* ============================================================
   BOTÕES RÁPIDOS DO DASHBOARD
============================================================ */

function configurarBotoesRapidos() {
    $$("[data-abrir]").forEach(botao => {

        botao.addEventListener(
            "click",
            () => {

                const secao =
                    botao.dataset.abrir;

                if (secao) {
                    mostrarSecao(
                        secao
                    );
                }
            }
        );
    });
}


/* ============================================================
   STATUS DO SISTEMA
============================================================ */

function atualizarStatusSistema() {
    const status =
        $(".status-sistema");

    if (!status) {
        return;
    }

    const ponto =
        status.querySelector(
            ".status-ponto"
        );

    if (ponto) {
        ponto.classList.add(
            "online"
        );
    }

    const texto =
        status.querySelector(
            "span:last-child"
        );

    if (texto) {
        texto.textContent =
            "Sistema Online";
    }
}


/* ============================================================
   NAVEGAÇÃO PRINCIPAL
============================================================ */

function configurarNavegacao() {
    $$(".menu-item").forEach(botao => {

        botao.addEventListener(
            "click",
            () => {

                const secao =
                    botao.dataset.secao;

                if (!secao) {
                    return;
                }

                mostrarSecao(
                    secao
                );
            }
        );
    });
}


/* ============================================================
   BUSCA DE CLIENTES
============================================================ */

function configurarBuscaClientes() {
    const campo =
        $("#buscarCliente");

    if (!campo) {
        return;
    }

    campo.addEventListener(
        "input",
        () => {
            renderizarClientes(
                campo.value
            );
        }
    );
}


/* ============================================================
   BUSCA DE EQUIPAMENTOS
============================================================ */

function configurarBuscaEquipamentos() {
    const campo =
        $("#buscarAparelho");

    if (!campo) {
        return;
    }

    campo.addEventListener(
        "input",
        () => {
            renderizarEquipamentos(
                campo.value
            );
        }
    );
}


/* ============================================================
   BUSCA DE ORDENS
============================================================ */

function configurarBuscaOrdens() {
    const campo =
        $("#buscarOrdem");

    if (!campo) {
        return;
    }

    campo.addEventListener(
        "input",
        () => {
            renderizarOrdens();
        }
    );
}


/* ============================================================
   CLIENTE SELECIONADO NA OS
============================================================ */

function configurarClienteOS() {
    const select =
        $("#clienteOS");

    if (!select) {
        return;
    }

    select.addEventListener(
        "change",
        atualizarDadosClienteSelecionado
    );
}


/* ============================================================
   BOTÃO NOVO CLIENTE
============================================================ */

function configurarNovoCliente() {
    const botao =
        $("#btnNovoCliente");

    if (!botao) {
        return;
    }

    botao.addEventListener(
        "click",
        () => {
            abrirModalCliente();
        }
    );
}


/* ============================================================
   FORMULÁRIO DA ORDEM
============================================================ */

function configurarFormularioOS() {
    const form =
        $("#formOrdem");

    if (!form) {
        return;
    }

    form.addEventListener(
        "submit",
        salvarOrdem
    );

    garantirCampoEdicao();
}


/* ============================================================
   MÁSCARA DE TELEFONE
============================================================ */

function configurarTelefoneOS() {
    const campo =
        $("#telefoneClienteOS");

    if (!campo) {
        return;
    }

    campo.addEventListener(
        "input",
        () => {
            campo.value =
                formatarTelefone(
                    campo.value
                );
        }
    );
}


/* ============================================================
   TECLA ESC FECHA MODAIS
============================================================ */

function configurarTeclaEscape() {
    document.addEventListener(
        "keydown",
        evento => {

            if (evento.key !== "Escape") {
                return;
            }

            fecharModalCliente();
            fecharModalOS();
        }
    );
}


/* ============================================================
   ATUALIZAR TUDO
============================================================ */

function atualizarTudo() {
    renderizarDashboard();
    renderizarOrdens();
    renderizarClientes();
    renderizarEquipamentos();
    renderizarFinanceiro();
    preencherClientesOS();
}


/* ============================================================
   EVENTOS GERAIS
============================================================ */

function configurarEventosGerais() {
    configurarNavegacao();

    configurarBotoesRapidos();

    configurarBuscaOrdens();

    configurarBuscaClientes();

    configurarBuscaEquipamentos();

    configurarFiltrosOrdens();

    configurarClienteOS();

    configurarNovoCliente();

    configurarFormularioOS();

    configurarTelefoneOS();

    configurarCamposValores();

    configurarTeclaEscape();

    atualizarStatusSistema();
}


/* ============================================================
   INICIALIZAÇÃO DO SISTEMA
============================================================ */

function iniciarSistema() {

    carregarDados();

    aplicarTema();

    reconstruirFinanceiro();

    configurarEventosGerais();

    atualizarTudo();

    mostrarSecao(
        "dashboard"
    );

    console.log(
        "TECH MM iniciado com sucesso."
    );
}


/* ============================================================
   EXPOSIÇÃO DAS FUNÇÕES
============================================================ */

window.iniciarSistema =
    iniciarSistema;

window.renderizarDashboard =
    renderizarDashboard;

window.renderizarOrdens =
    renderizarOrdens;

window.renderizarClientes =
    renderizarClientes;

window.renderizarEquipamentos =
    renderizarEquipamentos;

window.renderizarFinanceiro =
    renderizarFinanceiro;

window.calcularTotalOS =
    calcularTotalOS;

window.atualizarTudo =
    atualizarTudo;


/* ============================================================
   INICIAR QUANDO A PÁGINA CARREGAR
============================================================ */

if (
    document.readyState ===
    "loading"
) {
    document.addEventListener(
        "DOMContentLoaded",
        iniciarSistema
    );
} else {
    iniciarSistema();
}


/* ============================================================
   FIM DO SCRIPT.JS
   TECH MM
============================================================ */
