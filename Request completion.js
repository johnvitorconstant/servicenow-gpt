(function executeRule(current, previous /*null when async*/ ) {

    var a = current.work_notes.getJournalEntry(1);
    if (a.includes('@gpt')) run();

    function run() {

        var gr = new GlideRecord('sys_journal_field');
        gr.addQuery('element_id', current.getUniqueValue());
        gr.orderBy("sys_created_on");
        gr.query();

        var input = [];
        var role = '';
        while (gr.next()) {
            if (gr.getValue('element') == 'u_gpt_comment') {
                role = 'assistant';
            } else {
                role = 'user';
            }
            input.push({
                'role': role,
                'content': removeAtGpt(gr.getValue('value').trim())
            });
        }


        var content = new global.OpenAI().createChatCompletion(input, current.getUniqueValue()).content;


        current.u_gpt_comment.setJournalEntry(content, 'gpt');

        current.update();
    }

    function removeAtGpt(str) {
        return str.startsWith('@gpt') ? str.replace('@gpt', '') : str;
    }

    // Add your code here

})(current, previous);
