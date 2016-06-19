/*!
 * jquery-validate.js
 * jQuery 验证插件
 * https://github.com/chendye/jquery-validate
 * © by chenxiaofeng  
 * 2016-06-15 v1.1.0	面向对象，进行二次重构；改善一些命名
 * 2016-06-15 v1.1.1	增加配置：1、focusReset，在获取焦点时重置
 * 							   2、vaNameSelector，字段名选择器
 * 2016-06-19 v2.1.0    使用事件代理第三次重构，更在符合mvvm下属性随时可能发生改变的情况，降低使用压力。
 */

(function(define) {
	define(["jQuery"], function($) {

		var version = "1.0.0";
		//默认配置
		var defaults = {
			ajaxTimeout: 20, //秒
			vaNameSelector: "", //标签名选择器

			focusReset: false, //在获取焦点时重置

			onAjaxJudge: function() {
				//ajax判断函数
				return "";
			},

			onReset: function(elems) {
				//重置
			},
			onCorrect: function(elems) {
				//验证通过
			},
			onError: function(elems,all) {
				//验证不通过
				elems.forEach(function(el) {
					console.error(el.emsg);
				});
				all&&console.info("全部验证："+all);
			}
		};
		//id 数组，用于去重
		var uniques = [];

		//尝试读取全局配置
		try {
			for (var i in vaConfig) {
				//属性保护
				if (vaConfig.hasOwnProperty(i) && defaults.hasOwnProperty(i)) {

					defaults[i] = vaConfig[i];
				}
			}
		} catch (e) {
			console.error("未检测到全局验证设定 vaConfig。");
		}

		//验证器的构造函数
		var Va = function(id, con) {
			var that = this;
			
			if (!id) {
				throw new Error("表单id不能为null。");
				return;
			}
			if (uniques.indexOf(id) !== -1) {
				throw new Error("生成验证对象失败：重复的id。");
				return;
			}
			that.id = id;
			that.errElems = []; //出错的
			that.ajaxingElems = [];

			if (con && typeof con == "object") {

				for (var i in con) {
					if (con.hasOwnProperty(i)) {

						that[i] = con[i];
					}
				}
			}

			_init(id, that);
			uniques.push(id);
		}

		Va.prototype = defaults;
		
		//1、验证/重置 全部
		Va.prototype.validateAll = function(callback) {
				var that = this;

				if (callback) {
					//触发验证
					$("#" + that.id).find("[va-rules]:visible").trigger("validate");

					that._validated(callback);
				} else {
					//重置验证
					var elems = [];
					$("#" + that.id).find("[va-rules]").each(function(index, item) {
						elems.push(item);
						if (item.vaRemote) { //阻止正在验证的ajax请求
							item.vaRemote.abort();
							item.vaRemote = null;
						}
					})
					that.onReset(elems)
					that.errElems.length = 0;
					that.ajaxingElems.length = 0;
				}
			}
		//2、重置某个元素 ，譬如某个需要验证的输入框在隐藏时 需要重置
		Va.prototype.validateReset = function(elem) {
			var that = this;

			_remove(that.errElems, elem)
			elem.emsg = null;
			that.onReset([elem]);

		}

		//验证不通过
		Va.prototype._errorHandler = function(elem, msg, isTrigger) {
			var that = this;

			elem.emsg = msg;
			_ensure(that.errElems, elem);

			isTrigger && that.onError([elem]);
		}

		//验证通过
		Va.prototype._correctHandler = function(elem) {
			var that = this;

			elem.emsg = "";
			_remove(that.errElems, elem)

			that.onCorrect([elem]);
		}

		//验证做完
		Va.prototype._validated = function(callback) {
				var that = this;

				if (that.ajaxingElems.length === 0) {

					that.errElems.length === 0 ? callback() : that.onError(that.errElems, true);
				} else {
					//寄存回调函数
					that._validated._backfn = callback;
				}

			}
			//工具函数
			//1、插入不存在的元素 需要单个
		var _ensure = function(arr, item) {
				var index = arr.indexOf(item);
				if (index === -1) {
					arr.push(item);
				}
			}
			//2、从arr中移除元素
		var _remove = function(arr, item) {
			var index = arr.indexOf(item);
			if (index !== -1) {
				return arr.splice(index, 1);
			}
		}

		var _remote = function(vname, val, $cur, validator, isTrigger) {
				var url = $cur.attr("va-url"),
					para = {};

				//解析参数
				var paraStr = $cur.attr("va-morepara");
				if (paraStr) {
					var paras = paraStr.split(",");
					paras.forEach(function(item) {
						var kv = item.split(":");
						para[kv[0]] = kv[1];
					});
				};
				para[$cur.attr("va-paraname") || "query"] = val;

				var elem = $cur[0];

				//阻止正在请求的ajax
				if (elem.vaRemote) {
					elem.vaRemote.abort();
				};

				//重新添加ajax对象
				elem.vaRemote = $.ajax({
					type: "get",
					url: url,
					async: true,
					data: para || {},
					success: function(d) {
						//考虑服务端其他异常情况，
						var emsg = validator.onAjaxJudge.apply(null, [d]);

						if (emsg) {
							validator._errorHandler(elem, (vname + emsg), isTrigger)
						} else {
							validator._correctHandler(elem);
						};
					},
					error: function(xhr, textStatus, errorThrown) {
						if (textStatus === "abort") {
							return;
						}
						validator._errorHandler(elem, (vname + "验证失败，请重新尝试。"), isTrigger)
					},
					complete: function() {
						//从ajax队列中移除
						_remove(validator.ajaxingElems, elem);
						elem.vaRemote = null;

						//执行寄存的回调
						var callback;

						if (callback = validator._validated._backfn) {
							validator._validated._backfn = null;
							validator._validated(callback);
						}
					},
					timeout: (validator.ajaxTimeout * 1000)
				});

				//添加到加载队列
				validator.ajaxingElems.push(elem);
			}
			/*校验正则*/
		var _RegExps = {
				"integer": /^\d*$/,
				"telephone": /^\d{11}$/,
				"bankcard": /^\d{16}|\d{19}$/,
				"idcard": /(^\d{15}$)|(^\d{18}$)|(^\d{17}(\d|X|x)$)/
					//  		"decimal":/^-?\d+\.?\d{0,2}$/ 动态生成
			}
		var _patterns={
			requiredPattern:/required/,//必输正则
			blurPattern:/telephone|bankcard|idcard/, //匹配规则
			entryPattern:/integer|(decimal)(\d?)/,  //输入性判断
			remotePattern:/remote/ //ajax
		}
			/*初始化*/
		var _init = function(id, validator) {

			var $form = $("#" + id);
			
			$form.find("[va-rules]").each(function() {
				var $el=$(this);
				var name = $el.attr("va-name");

				if (!name) {
					var vaNameSelector = validator.vaNameSelector;
					var vaNameElem = vaNameSelector ? $el.closest(vaNameSelector) : "";

					name = vaNameElem ? vaNameElem.text() : "";

					if (!name) {
						console.info("未找到以下输入项的name，提示信息可能会不完整：")
						console.log($el[0]);
					}

					$el.attr("va-name", name)
				}
			})
			
			$form.on("focus","[va-rules]",function(ev){
								
				var $cur = $(ev.target);
				var elem=$cur[0]
				//得到焦点时重置
				if (validator.focusReset) {
					validator.onReset([elem])
				}
				
				var rules = $cur.attr("va-rules").toLowerCase();
				 dynamicRule = /integer|(decimal)(\d?)/gi.exec(rules);
				 
				if(dynamicRule){
					var epattern= dynamicRule[1] 
										? new RegExp("^(-?\\d+\\.?\\d{0," + (dynamicRule[2] || 2) + "}){0,1}$")
										:  _RegExps[dynamicRule[0]];
					
					//验证当前的值是否符合规则
					if (!epattern.test($cur.val())) {
						//不符合规则，清空~
						$cur.val("");
						$cur.attr("va-prevalue", "");
					}
				}
			});
			
			$form.on("input","[va-rules]",function(ev){
				var $cur = $(ev.target);
				
				var rules = $cur.attr("va-rules").toLowerCase();
				rules = /integer|(decimal)(\d?)/gi.exec(rules);
				
				if(rules){
					var val = $cur.val().trim();
					var epattern= dynamicRule[1] 
										? new RegExp("^(-?\\d+\\.?\\d{0," + (dynamicRule[2] || 2) + "}){0,1}$")
										:  _RegExps[dynamicRule[0]];
					var upToRule = epattern.test(val);
					
					if (!upToRule) {
						$cur.val($cur.attr("va-prevalue"));
					} else {
						$cur.attr("va-prevalue", $cur.val());
					}
				}
			});
			$form.on("blur validate","[va-rules]",function(ev){
				var $cur = $(ev.target);
				//是否触发错误函数
				var isTrigger = (ev.type !== "validate");
				
				var rules = $cur.attr("va-rules").toLowerCase();
				
				var vname = $cur.attr("va-name");
				var val = ($cur.val() || "").trim();

				//去掉用户看不见的空格
				$cur.val(val);
				
				var noValue = (val === null || val === "");
				var elem = $cur[0];
				
				if (!noValue) {
					// 正确性校验
					
					//1.数值类型
					var dynamicRule = /integer|(decimal)(\d?)/gi.exec(rules);
					if(dynamicRule){
						var epattern = dynamicRule[1]
										? new RegExp("^(-?\\d+\\.?\\d{0," + (dynamicRule[2] * 1 || 2) + "}){0,1}$")
										: _RegExps[dynamicRule[0]];
										
						if (!epattern.test(val)) {
							validator._errorHandler(elem, (vname + "输入有误，请重新输入。"), isTrigger)
							return;
						}
						//大小值
						var min = $cur.attr("va-min") * 1;
						if (min && val < min) {
							validator._errorHandler(elem, (vname + "不能小于" + min + "。"), isTrigger)
							return;
						}
	
						var max = $cur.attr("va-max") * 1;
						if (max && val > max) {
							validator._errorHandler(elem, (vname + "不能大于" + min + "。"), isTrigger)
							return;
						}
					}
					
					//固定格式类型
					var sureRule=/telephone|bankcard|idcard/.exec(rules);
					if(sureRule&&!_RegExps[sureRule[0]].test(val)){
						validator._errorHandler(elem, (vname + "输入有误，请重新输入。"), isTrigger)
						return;
					}
					
					//远程校验
					var isRemote=/remote/.test(rules);
					if(isRemote){
						_remote(vname, val, $cur, validator, isTrigger);
						return;
					}
					
					//全部通过
					validator._correctHandler(elem)
				}else if(/required/.test(rules)){
					//需要性验证
					validator._errorHandler(elem, (vname + "不能为空。"), isTrigger);
					
				}
			});
			
			if(!define.amd){
				$form.on("validateAll",function(backfn,config){
					validator.validateAll(backfn,config)
				});
				$form.on("validateReset",function(el){
					validator.validateReset(el)
				});
			}
		}
		return define.amd?function(id, config) {
			return new Va(id, config)
		}:function(config){
			return new Va($(this).attr("id"), config)
		}
	});
}(typeof define === 'function' && define.amd ? define : function(deps, factory) {
	$.fn.validate = factory(jQuery);
}));