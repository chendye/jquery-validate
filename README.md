# jquery-validate 2.1.1（IE9+）11

1. 只做正确性验证，无任何默认ui（可通过回调的配置实现ui显示）；
2. 四类规则任意组合；
3. 使用事件代理实现，规则可随时改变，在页面级保证不会提交错误数据

##一、使用介绍
1. 初始化（同时支持AMD加载，和标签引人两种形式）
			
		标签引人
			<script src="jquery-validate.js" type="text/javascript" charset="utf-8"></script>
			<script type="text/javascript">
				$(function(){
					var va=	$("#demo").validate({
						onAjaxJudge:function(d){
							if(d.errorCode===300){
								return "已存在。"
							}
						}
					});
					
					$("input[type=submit]").click(function(){
						va.validateAll(function(){
							alert("全部验证通过。")
						});
					})
					$("input[type=reset]").click(function(){
						va.validateAll();
					})
				})
			</script>
		
	

2. 全局的通用配置（定义一个全局变量vaConfig，在插件初始化的时候会读取该配置
	
		var vaConfig={
				ajaxTimeout: 20, //ajax 请求的延时 秒
				vaNameSelector: "", //校验的字段名选择器
	
				focusReset: false, //是否在获取焦点时重置
	
				onAjaxJudge: function() {
					//ajax请求成功后的判断函数
					return "";
				},
	
				onReset: function(elems) {//elems 错误的输入项 Array
					//重置
				},
				onCorrect: function(elems) {
					//验证通过
				},
				onError: function(elems,all) { //all 是否是验证整个表单
					//验证不通过
					console.log(this)
					elems.forEach(function(el) {
						console.error(el.emsg);//emsg 提示消息
					});
					all&&console.log("全部验证："+all);
				}
			}

3. 单个表单个性化配置
	
		var va=	$("#demo").validate({
					onAjaxJudge:function(d){
						if(d.errorCode===300){
							return "已存在。"
						}
					}
				});
	

##二、四类规则
1. 必须有输入 va-rules = "required";
2. 数值类型   va-rules = "integer";
3. 固定格式   va-rules = "telephone"
4. ajax验证  va-rules = "remote"

##三、指令介绍

1. va-rules=required //必填，不为空，不为0
2. va-rules=telephone //电话号码
3. va-rules=bankcard //银行卡号
4. va-rules=idcard //身份证号
5. va-rules=integer //只能输入正整数（含0）
6. va-rules=decimal[num] //只能输入正数（含0），num：允许输入的小数位数（默认2位小数）

其他指令

1. va-name //提示文字中的名字 ，能够使用vaNameSelector选择器选择可不写
2. va-url //ajax验证的地址
3. va-paraname //ajax验证的参数名，默认query
4. va-morepara //ajax验证的其他参数(格式key:value) 栗子：va-morepara="id:,type:0"
5. va-min //数字的最大最小值 (包含)
6. va-max



