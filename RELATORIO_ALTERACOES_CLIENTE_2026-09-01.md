# Relatório de alterações - Filhos do Rei BJJ

Data: 01/09/2026

## Melhorias realizadas

1. Planos
- O administrador agora pode excluir planos que não serão mais usados.
- Quando um plano é excluído, os alunos vinculados ficam sem plano definido para evitar erro ou perda de cadastro.

2. Gestão de alunos
- A tela de alunos agora permite ao administrador excluir o registro de um aluno que saiu da academia.
- A exclusão remove também o acesso do aluno quando houver usuário vinculado.

3. Financeiro do aluno
- A área financeira do aluno foi reorganizada para mostrar mensalidade em destaque, valor em aberto, valores pagos, histórico e PIX de forma mais clara.
- O aluno continua podendo gerar mensalidades futuras para pagamento adiantado.

4. Envio de pagamento para análise
- O aluno agora pode marcar uma mensalidade como “enviar pagamento para análise”.
- O professor/administrador recebe essa solicitação na aba Financeiro, na seção “Confirmar pagamentos”.
- Ao confirmar, o pagamento é marcado como pago e entra automaticamente no controle financeiro da academia.
- Ao recusar, o pagamento continua pendente para conferência.

5. Lembre-me no login
- A opção “Lembrar-me” foi corrigida.
- Quando marcada, mantém a sessão e lembra o usuário/e-mail.
- Quando não marcada, a sessão fica apenas temporária no navegador.
- A senha não é salva em texto por segurança.

6. Regra de senha
- A regra foi alterada para mínimo de 6 e máximo de 12 caracteres.
- Continua exigindo pelo menos um caractere especial.
- Senhas já existentes não foram alteradas nem danificadas.

## Validação

- Build do servidor concluído com sucesso.
- Build do aplicativo web/PWA concluído com sucesso.
- Alterações preparadas para publicação sem remover dados existentes.
