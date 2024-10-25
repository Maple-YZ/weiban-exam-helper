// ==UserScript==
// @name         自动答题脚本（需人工看着的粗糙版本）
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  提取题目并自动选择答案，支持手动触发
// @author       ChatGPT-4o and MapleL
// @match        https://weiban.mycourse.cn/*
// @grant        GM_xmlhttpRequest
// @require      https://cdn.jsdelivr.net/npm/marked/marked.min.js
// ==/UserScript==

(function() {
    'use strict';
    let lastQuestion;

    // 提取页面中的题目和选项
    function getQuestionAndOptions() {
        let question = document.querySelector('.quest-stem').innerText.trim();
        question = question.replace(/^[\d.、]+/, '').trim();
        let options = Array.from(document.querySelectorAll('.quest-option-item .quest-option-top')).map(item => item.innerText.trim());
        return { question, options };
    }

    // 在 GitHub 文本中查找答案
    function findAnswerInGitHub(question) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'GET',
                url: 'https://raw.githubusercontent.com/pooneyy/WeibanQuestionsBank/refs/heads/main/weibanQuestionBank.md',
                onload: function(response) {
                    if (response.status === 200) {
                        const content = response.responseText;
                        const lines = content.split('\n');
                        const matchedLine = lines.find(line => line.includes(question));
                        if (matchedLine) {
                            // 提取所有可能的答案，以“|”为分隔符
                            const answerParts = matchedLine.split('|').slice(2).map(answer => answer.trim()).filter(answer => answer.length > 0);
                            resolve(answerParts);
                        } else {
                            resolve(null);
                        }
                    } else {
                        reject('无法获取题库');
                    }
                },
                onerror: function() {
                    reject('请求错误');
                }
            });
        });
    }

    // 自动选择正确答案（多选题支持）
    async function selectCorrectAnswer() {
        let { question, options } = getQuestionAndOptions();
        let answers = await findAnswerInGitHub(question);

        if (answers && answers.length > 0) {
            answers.forEach(answer => {
                let correctOption = options.find(option => option.includes(answer));
                if (correctOption) {
                    let optionElement = Array.from(document.querySelectorAll('.quest-option-item')).find(item => item.innerText.includes(correctOption));
                    if (optionElement) {
                        optionElement.click();
                        console.log(`题目: ${question}，答案: ${answer}，选项: ${correctOption}`);
                    }
                }
            });

            // 找到包含 "下一题" 文本的按钮
            const buttons = document.querySelectorAll('button .mint-button-text');
            let nextButton = null;

            buttons.forEach(button => {
                if (button.textContent.includes("下一题")) {
                    nextButton = button;
                }
            });

            if (nextButton) {
                if (lastQuestion!=question) {
                    lastQuestion = question;
                // 等待1秒后再点击按钮
                    setTimeout(() => {
                        nextButton.click();
                        console.log('1秒后点击了下一题按钮');
                        setTimeout(() => {
                            selectCorrectAnswer();
                            console.log('继续自动答题');
                        }, 1000);
                    }, 1000);
                } else {
                    console.log('无法继续答题');
                }
            } else {
                console.log('未找到下一题按钮');
            }
        } else {
            console.log(`未找到题目: ${question} 对应的答案`);
        }
    }

    // 创建并插入“开始自动答题”按钮
    function createAnswerButton() {
        let button = document.createElement('button');
        button.innerText = '开始自动答题';
        button.style.position = 'fixed';
        button.style.top = '10px';
        button.style.right = '10px';
        button.style.zIndex = '1000';
        button.style.backgroundColor = '#4CAF50';
        button.style.color = 'white';
        button.style.padding = '10px';
        button.style.border = 'none';
        button.style.borderRadius = '5px';
        button.style.cursor = 'pointer';

        button.addEventListener('click', function() {
            console.log("尝试自动答题");
            selectCorrectAnswer();
        });

        document.body.appendChild(button);
    }

    // 等待页面加载完成并创建按钮
    window.addEventListener('load', function() {
        createAnswerButton();
    });
})();
