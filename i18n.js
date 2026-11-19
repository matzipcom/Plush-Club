const languageStorageKey = "plush-club-language-v1";
const languageCodes = ["ko", "en", "ja", "zh"];
const phrases = [
	["말랑말랑 인형뽑기", "Plush Club Claw Machine", "ふわふわクレーンゲーム", "软绵绵抓娃娃"],
	["말랑말랑 인형뽑기 게임", "Plush Club Claw Machine", "ふわふわクレーンゲーム", "软绵绵抓娃娃"],
	["데려온 친구", "Friends collected", "お迎えした友だち", "已收集玩偶"],
	["다크 모드 켜기", "Turn on dark mode", "ダークモードをオン", "开启深色模式"],
	["라이트 모드 켜기", "Turn on light mode", "ライトモードをオン", "开启浅色模式"],
	["언어 선택", "Select language", "言語を選択", "选择语言"],
	["+5 코인", "+5 coins", "+5コイン", "+5金币"],
	["가방", "Bag", "バッグ", "背包"],
	["상점", "Shop", "ショップ", "商店"],
	["익명 커뮤니티", "Community", "匿名コミュニティ", "匿名社区"],
	["Instagram 계정 열기", "Open Instagram profile", "Instagramを開く", "打开 Instagram 主页"],
	["로그아웃", "Log out", "ログアウト", "退出登录"],
	["게스트 플레이", "Guest", "ゲストプレイ", "游客模式"],
	["로그인", "Log in", "ログイン", "登录"],
	["동물 인형", "Animal plushies", "動物のぬいぐるみ", "动物玩偶"],
	["찢토피아", "Chizztopia", "チッチトピア", "Chizztopia"],
	["찢토피아 구매 · 1,000코인", "Unlock Chizztopia · 1,000 coins", "チッチトピアを購入 · 1,000コイン", "购买Chizztopia · 1,000金币"],
	["찢토피아 · 구매 완료", "Chizztopia · Unlocked", "チッチトピア · 購入済み", "Chizztopia · 已解锁"],
	["인형별 재입고", "Restock by plushie", "ぬいぐるみの補充", "玩偶补货"],
	["11마리 준비 완료", "11 plushies ready", "11体準備完了", "11只已准备好"],
	["3D 인형뽑기 기계", "3D claw machine", "3Dクレーンゲーム", "3D抓娃娃机"],
	["드래그해 인형뽑기 기계 시점을 돌리고, 확대 축소 버튼으로 화면 크기를 조절하세요", "Drag to rotate the claw machine. Use the zoom buttons to adjust the view.", "ドラッグでクレーンゲームを回転し、ズームボタンで表示を調整します。", "拖动旋转抓娃娃机，使用缩放按钮调整视图。"],
	["화면 확대 및 축소", "Zoom controls", "ズーム操作", "缩放控制"],
	["화면 확대", "Zoom in", "拡大", "放大"],
	["확대", "Zoom in", "拡大", "放大"],
	["화면 축소", "Zoom out", "縮小", "缩小"],
	["축소", "Zoom out", "縮小", "缩小"],
	["화면 드래그", "Drag the view", "画面をドラッグ", "拖动视图"],
	["로 기계를 돌리고", " to rotate the machine, then", "してマシンを回し、", "旋转机器，然后"],
	["조이스틱", "the joystick", "ジョイスティック", "摇杆"],
	["으로 집게를 움직이세요", " to move the claw", "でクレーンを動かします", "移动夹爪"],
	["게임 조작", "Game controls", "ゲーム操作", "游戏操作"],
	["집게 조이스틱. 드래그하여 방향과 거리를 조절하세요.", "Claw joystick. Drag to control direction and distance.", "クレーン用ジョイスティック。ドラッグして方向と距離を調整します。", "夹爪摇杆。拖动以控制方向和距离。"],
	["인형 뽑기", "Grab a plushie", "ぬいぐるみを取る", "抓取玩偶"],
	["게임 다시 시작", "Restart game", "ゲームをリスタート", "重新开始游戏"],
	["다시 시작", "Restart", "リスタート", "重新开始"],
	["계정 로그인", "Account login", "アカウントログイン", "账号登录"],
	["PLUSH CLUB · MEMBERS", "PLUSH CLUB · MEMBERS", "PLUSH CLUB · MEMBERS", "PLUSH CLUB · MEMBERS"],
	["인형 친구를 만나볼까요?", "Ready to meet your plushie?", "ぬいぐるみのお友だちに会いましょう", "来认识你的玩偶朋友吧？"],
	["계정에 로그인하면 코인을 충전해 플레이하고, 뽑은 인형을 나만의 가방에 모을 수 있어요.", "Log in to collect coins, play, and keep the plushies you win in your bag.", "ログインするとコインをためて遊び、獲得したぬいぐるみをバッグに集められます。", "登录后即可领取金币、进行游戏，并将抓到的玩偶收藏到背包中。"],
	["로그인 또는 회원가입", "Log in or sign up", "ログインまたは新規登録", "登录或注册"],
	["회원가입", "Sign up", "新規登録", "注册"],
	["이메일", "Email", "メールアドレス", "电子邮箱"],
	["아이디", "Username", "ユーザー名", "用户名"],
	["비밀번호", "Password", "パスワード", "密码"],
	["비밀번호 확인", "Confirm password", "パスワード（確認）", "确认密码"],
	["인증 메일 다시 보내기", "Resend confirmation email", "確認メールを再送", "重新发送验证邮件"],
	["게스트로 계속 플레이", "Continue as guest", "ゲストとして続ける", "以游客身份继续"],
	["계정과 게임 기록은 이 브라우저에 저장됩니다.", "Your account and game progress are saved in this browser.", "アカウントとゲーム記録はこのブラウザーに保存されます。", "账号和游戏记录会保存在此浏览器中。"],
	["내 인형 가방", "My plushie bag", "ぬいぐるみバッグ", "我的玩偶背包"],
	["가방 닫기", "Close bag", "バッグを閉じる", "关闭背包"],
	["아직 데려온 친구가 없어요.", "You haven't collected any plushies yet.", "まだぬいぐるみをお迎えしていません。", "还没有收集玩偶。"],
	["인형 상점", "Plushie shop", "ぬいぐるみショップ", "玩偶商店"],
	["상점 닫기", "Close shop", "ショップを閉じる", "关闭商店"],
	["다른 회원과 인형을 거래해요.", "Trade plushies with other members.", "ほかのメンバーとぬいぐるみを取引できます。", "与其他会员交易玩偶。"],
	["매물 새로고침", "Refresh listings", "出品を更新", "刷新商品列表"],
	["새로고침", "Refresh", "更新", "刷新"],
	["판매 중인 인형", "Plushies for sale", "販売中のぬいぐるみ", "正在出售的玩偶"],
	["내 인형 판매 등록", "List my plushies", "ぬいぐるみを出品", "发布我的玩偶"],
	["인형 획득 축하", "Plushie collected", "ぬいぐるみ獲得のお祝い", "恭喜获得玩偶"],
	["A NEW FRIEND!", "A NEW FRIEND!", "A NEW FRIEND!", "A NEW FRIEND!"],
	["인형을 뽑으셨어요!", "You got a plushie!", "ぬいぐるみをゲットしました！", "抓到玩偶了！"],
	["축하해요, 새로운 친구가 도착했어요.", "Congratulations! A new friend has arrived.", "おめでとうございます！新しいお友だちが来ました。", "恭喜！新朋友来啦。"],
	["방금 뽑은 인형 3D 미리보기. 손가락이나 마우스로 끌어 회전", "3D preview of your new plushie. Drag to rotate.", "獲得したぬいぐるみの3Dプレビュー。ドラッグして回転できます。", "新玩偶的3D预览。拖动即可旋转。"],
	["공유하기", "Share", "共有", "分享"],
	["닫기", "Close", "閉じる", "关闭"],
	["찢칠라 3D 모델을 불러오지 못해 이미지 모델로 표시합니다.", "Couldn't load the Chizzilla 3D model. Showing an image instead.", "チッチラの3Dモデルを読み込めなかったため、画像で表示します。", "无法加载찢칠라的3D模型，现以图片显示。"],
	["대리석 문코리타 3D 모델을 불러오지 못해 기본 인형으로 표시합니다.", "Couldn't load the marble Moonkorita 3D model. Showing a standard plushie instead.", "大理石ムンコリタの3Dモデルを読み込めなかったため、通常のぬいぐるみで表示します。", "无法加载大理石文科丽塔的3D模型，现以普通玩偶显示。"],
	["문코리타 3D 모델을 불러오지 못해 기본 인형으로 표시합니다.", "Couldn't load the Moonkorita 3D model. Showing a standard plushie instead.", "ムンコリタの3Dモデルを読み込めなかったため、通常のぬいぐるみで表示します。", "无法加载文科丽塔的3D模型，现以普通玩偶显示。"],
	["찢칠라 이미지를 불러오지 못했어요. 페이지를 새로고침해 주세요.", "Couldn't load the Chizzilla image. Please refresh the page.", "チッチラの画像を読み込めませんでした。ページを再読み込みしてください。", "无法加载찢칠라图片，请刷新页面。"],
	["보충 기록을 불러오지 못했어요. 현재 브라우저에서 새로 시작합니다.", "Couldn't load restock data. Starting fresh in this browser.", "補充データを読み込めませんでした。このブラウザーで新しく開始します。", "无法加载补货记录，将在此浏览器中重新开始。"],
	["집게가 돌아온 뒤 맵을 바꿀 수 있어요.", "You can change maps after the claw returns.", "クレーンが戻ってからマップを変更できます。", "夹爪返回后即可切换地图。"],
	["집게가 돌아온 뒤 찢토피아에 입장할 수 있어요.", "You can enter Chizztopia after the claw returns.", "クレーンが戻ってからチッチトピアに入れます。", "夹爪返回后即可进入Chizztopia。"],
	["찢토피아 이용권 구매가 확인됐어요. 코인 차감 없이 입장합니다.", "Chizztopia access is confirmed. Entering without charging coins.", "チッチトピアの購入を確認しました。コインを差し引かずに入室します。", "已确认购买Chizztopia，无需扣除金币即可进入。"],
	["찢토피아 구매 설정이 필요해요. 최신 supabase/schema.sql을 실행해 주세요.", "Chizztopia purchases need setup. Run the latest supabase/schema.sql.", "チッチトピアの購入設定が必要です。最新のsupabase/schema.sqlを実行してください。", "需要配置Chizztopia购买功能。请运行最新版supabase/schema.sql。"],
	["찢토피아 구매를 처리하지 못했어요. 다시 시도해 주세요.", "Couldn't process the Chizztopia purchase. Please try again.", "チッチトピアの購入を処理できませんでした。もう一度お試しください。", "无法处理Chizztopia购买，请重试。"],
	["보충 시간 저장에 실패했어요. 브라우저 저장 공간을 확인해 주세요.", "Couldn't save restock times. Check your browser storage.", "補充時間を保存できませんでした。ブラウザーのストレージを確認してください。", "无法保存补货时间，请检查浏览器存储空间。"],
	["코인이 부족해요. +5 코인 버튼으로 먼저 충전해 주세요.", "Not enough coins. Claim +5 coins before playing.", "コインが足りません。先に「+5コイン」で受け取ってください。", "金币不足，请先点击“+5金币”领取金币。"],
	["게스트 코인을 저장할 수 없어요. 이 브라우저에서만 유지됩니다.", "Couldn't save guest coins. They'll remain available only in this browser.", "ゲストコインを保存できません。このブラウザーでのみ利用できます。", "无法保存游客金币，这些金币仅在此浏览器中有效。"],
	["코인 대기 시간을 저장하지 못했어요.", "Couldn't save the coin cooldown.", "コインの待ち時間を保存できませんでした。", "无法保存金币等待时间。"],
	["계정 정보를 저장할 수 없어요. 브라우저 저장 공간을 확인해 주세요.", "Couldn't save account details. Check your browser storage.", "アカウント情報を保存できません。ブラウザーのストレージを確認してください。", "无法保存账号信息，请检查浏览器存储空间。"],
	["계정 저장에 실패했어요. Supabase 테이블 설정을 확인해 주세요.", "Couldn't save the account. Check your Supabase table setup.", "アカウントを保存できませんでした。Supabaseのテーブル設定を確認してください。", "账号保存失败，请检查Supabase表配置。"],
	["집게가 내려가는 중이에요...", "The claw is moving down...", "クレーンが降下中です...", "夹爪正在下降……"],
	["아깝다! 인형 위에 집게를 맞춰 다시 해봐요.", "So close! Line up the claw over a plushie and try again.", "惜しい！ぬいぐるみにクレーンを合わせてもう一度。", "差一点！把夹爪对准玩偶再试一次。"],
	["성공! 새 친구가 선물 상자에 도착했어요.", "Success! Your new friend is in the prize box.", "成功！新しいお友だちが景品ボックスに入りました。", "成功！新朋友已送达礼物盒。"],
	["집게가 내려가요. 앞뒤 위치도 잘 맞춰 보세요.", "The claw is descending. Adjust its position front to back, too.", "クレーンが降ります。前後の位置も調整してください。", "夹爪正在下降，也请调整前后位置。"],
	["인형 중심을 놓쳤어요. 앞뒤와 좌우를 더 정확히 맞춰 보세요.", "Missed the center. Align the claw more precisely front to back and side to side.", "中心を外しました。前後と左右をもう少し正確に合わせてください。", "没有对准玩偶中心，请更准确地调整前后和左右位置。"],
	["무거운 인형을 들어 올리지 못했어요. 가벼운 인형부터 도전해 보세요.", "The claw couldn't lift that heavy plushie. Try a lighter one.", "重いぬいぐるみを持ち上げられませんでした。軽いものから挑戦してください。", "夹爪没能抓起较重的玩偶，试试较轻的玩偶吧。"],
	["집게가 인형을 제대로 감싸지 못했어요.", "The claw couldn't close around the plushie.", "クレーンでぬいぐるみをうまくつかめませんでした。", "夹爪没有抓住玩偶。"],
	["무거운 인형이에요! 집게가 버텨야 해요.", "That's a heavy plushie! The claw has to hold on.", "重いぬいぐるみです！クレーンが耐えられるかな。", "这是个较重的玩偶！看看夹爪能否撑住。"],
	["집었어요! 집게가 천천히 들어 올립니다.", "Got it! The claw is lifting slowly.", "つかみました！クレーンがゆっくり持ち上げます。", "抓到了！夹爪正在缓缓升起。"],
	["인형이 무게를 못 이기고 집게에서 빠졌어요!", "The plushie was too heavy and slipped from the claw!", "重さに耐えきれず、ぬいぐるみが落ちました！", "玩偶太重，从夹爪中滑落了！"],
	["집게 힘이 약해 인형이 빠져나갔어요!", "The claw was too weak and the plushie slid out!", "クレーンの力が弱く、ぬいぐるみが抜け落ちました！", "夹爪力气不足，玩偶滑出去了！"],
	["꼭대기에서 덜컹! 충격에 인형이 떨어졌어요.", "Clunk at the top! The jolt shook the plushie loose.", "てっぺんでガタン！衝撃でぬいぐるみが落ちました。", "到顶时一震！玩偶被震掉了。"],
	["흔들리는 사이 인형이 미끄러졌어요!", "The plushie slipped while the claw was swinging!", "揺れている間にぬいぐるみが滑り落ちました！", "夹爪晃动时玩偶滑落了！"],
	["행운! 떨어진 인형이 출구로 쏙 들어갔어요.", "Lucky! The dropped plushie fell right into the prize chute.", "ラッキー！落ちたぬいぐるみが取り出し口にすっぽり入りました。", "好运！掉落的玩偶正好落进了出口。"],
	["인형이 무게를 못 이기고 집게에서 빠졌어요!", "The plushie was too heavy and slipped out of the claw!", "ぬいぐるみが重すぎてクレーンから抜け落ちました！", "玩偶太重，从夹爪里滑落了！"],
	["아쉬워요! 인형이 출구 테두리에 부딪혀 튕겨 나갔어요.", "So close! The plushie hit the chute rim and bounced away.", "惜しい！ぬいぐるみが取り出し口のふちに当たって跳ね返りました。", "可惜！玩偶撞到出口边缘弹开了。"],
	["인형이 출구 안으로 들어가지 못했어요. 다시 도전해 보세요!", "The plushie missed the prize chute. Try again!", "ぬいぐるみが取り出し口に入りませんでした。もう一度挑戦しましょう！", "玩偶没有掉进出口。再试一次吧！"],
	["집게 난이도", "Claw difficulty", "クレーンの難易度", "夹爪难度"],
	["재미 모드", "Fun mode", "たのしいモード", "趣味模式"],
	["현실 모드", "Realistic mode", "リアルモード", "真实模式"],
	["집게가 끝까지 꽉 잡아요", "The claw keeps its full grip all the way", "クレーンが最後までしっかりつかみます", "夹爪全程紧紧抓住"],
	["실제 기계처럼 들어 올린 뒤 집게 힘이 약해져요", "Like a real machine, the grip weakens after the lift", "実機のように、持ち上げた後はつかむ力が弱くなります", "像真实机器一样，抬起后夹力会变弱"],
	["재미 모드: 집게가 끝까지 꽉 잡아요.", "Fun mode: the claw keeps its full grip all the way.", "たのしいモード：クレーンが最後までしっかりつかみます。", "趣味模式：夹爪全程紧紧抓住。"],
	["현실 모드: 실제 기계처럼 들어 올린 뒤 집게 힘이 약해져요.", "Realistic mode: like a real machine, the grip weakens after the lift.", "リアルモード：実機のように、持ち上げた後はつかむ力が弱くなります。", "真实模式：像真实机器一样，抬起后夹力会变弱。"],
	["물리 엔진을 불러오는 중이에요. 잠시 후 다시 시도해 주세요.", "Loading the physics engine. Please try again in a moment.", "物理エンジンを読み込み中です。少し待ってからもう一度お試しください。", "正在加载物理引擎，请稍后再试。"],
	["물리 엔진을 불러오지 못했어요. 페이지를 새로고침해 주세요.", "Couldn't load the physics engine. Please refresh the page.", "物理エンジンを読み込めませんでした。ページを再読み込みしてください。", "无法加载物理引擎，请刷新页面。"],
	["인형에 닿았어요. 집게를 벌려 감쌉니다.", "The claw touched a plushie. Closing around it.", "ぬいぐるみに触れました。クレーンを閉じてつかみます。", "碰到玩偶了，夹爪正在合拢。"],
	["집게가 바닥에 닿았어요. 위치를 다시 맞춰 보세요.", "The claw reached the floor. Try adjusting its position.", "床に着きました。位置を調整してみてください。", "夹爪碰到底部了，请重新调整位置。"],
	["인형에 닿지 않았어요. 방향을 조금 조정해 보세요.", "Didn't reach a plushie. Try adjusting the direction.", "ぬいぐるみに届きませんでした。方向を少し調整してください。", "没有碰到玩偶，请稍微调整方向。"],
	["성공! 새 친구가 가방에 담겼어요.", "Success! Your new friend is in your bag.", "成功！新しいお友だちをバッグに迎えました。", "成功！新朋友已放入背包。"],
	["대성공! 모든 친구를 가방에 담았어요!", "Amazing! You collected every friend!", "大成功！すべてのお友だちをバッグに集めました！", "大成功！你收集了所有朋友！"],
	["로그인하지 않으면 인형이 가방에 모이지 않아요.", "Log in to collect plushies in your bag.", "ログインするとぬいぐるみをバッグに集められます。", "登录后才能将玩偶收藏到背包中。"],
	["게스트로 플레이할 수 있어요. 로그인하지 않으면 인형이 가방에 모이지 않아요.", "You can play as a guest. Log in to collect plushies in your bag.", "ゲストとして遊べます。ログインするとぬいぐるみをバッグに集められます。", "可以游客身份游玩。登录后才能将玩偶收藏到背包中。"],
	["로그인했어요. 코인을 사용해 인형을 뽑아 보세요.", "You're logged in. Use coins to grab a plushie.", "ログインしました。コインを使ってぬいぐるみを取りましょう。", "已登录，使用金币抓取玩偶吧。"],
	["+5 코인 버튼으로 코인을 충전해 주세요.", "Claim coins with the +5 coins button.", "+5コインボタンでコインを受け取ってください。", "点击“+5金币”领取金币。"],
	["로그인 중이에요.", "Logging in...", "ログイン中...", "正在登录……"],
	["처리 중...", "Processing...", "処理中...", "处理中……"],
	["아이디는 한글·영문·숫자·밑줄로 2~16자까지 입력해 주세요.", "Username must be 2–16 characters using letters, numbers, or underscores.", "ユーザー名は2～16文字で、英字・数字・アンダースコアを使用してください。", "用户名须为2至16个字符，可使用字母、数字和下划线。"],
	["비밀번호를 8자 이상 입력해 주세요.", "Password must be at least 8 characters.", "パスワードは8文字以上で入力してください。", "密码至少需要8个字符。"],
	["비밀번호 확인이 일치하지 않아요.", "Passwords don't match.", "パスワードが一致しません。", "两次输入的密码不一致。"],
	["이미 사용 중인 아이디예요.", "That username is already taken.", "このユーザー名はすでに使われています。", "此用户名已被使用。"],
	["아이디 또는 비밀번호를 확인해 주세요.", "Check your username and password.", "ユーザー名とパスワードを確認してください。", "请检查用户名和密码。"],
	["이메일 또는 비밀번호를 확인해 주세요.", "Check your email and password.", "メールアドレスとパスワードを確認してください。", "请检查邮箱和密码。"],
	["인증 요청을 완료하지 못했어요. 네트워크와 Supabase 설정을 확인한 뒤 다시 시도해 주세요.", "Couldn't complete authentication. Check your network and Supabase settings, then try again.", "認証を完了できませんでした。ネットワークとSupabaseの設定を確認して、もう一度お試しください。", "无法完成身份验证，请检查网络和Supabase设置后重试。"],
	["회원가입이 완료되어 로그인했어요.", "Sign-up complete. You're now logged in.", "新規登録が完了し、ログインしました。", "注册成功，已登录。"],
	["인증 메일을 다시 보내지 못했어요. Supabase SMTP 설정과 이메일 주소를 확인해 주세요.", "Couldn't resend the confirmation email. Check your Supabase SMTP settings and email address.", "確認メールを再送できませんでした。Supabase SMTPの設定とメールアドレスを確認してください。", "无法重新发送验证邮件，请检查Supabase SMTP设置和邮箱地址。"],
	["재전송 요청을 완료했어요. 받은 편지함과 스팸함을 확인해 주세요.", "Confirmation email requested. Check your inbox and spam folder.", "確認メールを再送しました。受信トレイと迷惑メールを確認してください。", "验证邮件已发送，请检查收件箱和垃圾邮件。"],
	["플레이가 끝난 뒤 로그아웃할 수 있어요.", "You can log out after the current game.", "プレイ終了後にログアウトできます。", "本局结束后即可退出登录。"],
	["로그아웃했어요. 게스트로 계속 플레이할 수 있어요.", "Logged out. You can continue playing as a guest.", "ログアウトしました。ゲストとして引き続き遊べます。", "已退出登录，可以继续以游客身份游玩。"],
	["로그아웃을 완료하지 못했어요. 다시 시도해 주세요.", "Couldn't log out. Please try again.", "ログアウトできませんでした。もう一度お試しください。", "无法退出登录，请重试。"],
	["공유를 완료하지 못했어요. 다시 시도해 주세요.", "Couldn't share. Please try again.", "共有できませんでした。もう一度お試しください。", "分享失败，请重试。"],
	["공유 링크를 복사했어요.", "Share link copied.", "共有リンクをコピーしました。", "分享链接已复制。"],
	["복사 완료", "Copied", "コピーしました", "已复制"],
	["선택 해제", "Clear selection", "選択を解除", "取消选择"],
	["선택", "Select", "選択", "选择"],
	["판매", "Sell", "出品", "出售"],
	["취소", "Cancel", "キャンセル", "取消"],
	["구매", "Buy", "購入", "购买"],
	["내 매물", "My listing", "自分の出品", "我的商品"],
	["회원 판매", "Member listing", "メンバーの出品", "会员商品"],
	["눌러서 정보 보기", "Click for details", "クリックして詳細を見る", "点击查看详情"],
	["판매할 인형이 가방에 없어요.", "You don't have any plushies to sell.", "出品できるぬいぐるみがバッグにありません。", "背包中没有可出售的玩偶。"],
	["상점 거래는 Supabase 회원만 이용할 수 있어요.", "Only Supabase members can trade in the shop.", "ショップ取引はSupabaseメンバーのみ利用できます。", "只有Supabase会员可以使用商店交易。"],
	["매물을 불러오는 중이에요.", "Loading listings...", "出品を読み込み中...", "正在加载商品……"],
	["현재 등록된 인형이 없어요.", "There are no plushies listed right now.", "現在出品中のぬいぐるみはありません。", "目前没有正在出售的玩偶。"],
	["상점 테이블을 사용할 수 없어요. 최신 supabase/schema.sql을 실행해 주세요.", "Shop tables are unavailable. Run the latest supabase/schema.sql.", "ショップのテーブルを利用できません。最新のsupabase/schema.sqlを実行してください。", "商店数据表不可用，请运行最新版supabase/schema.sql。"],
	["상점 데이터베이스 설정이 필요해요. 최신 supabase/schema.sql을 실행해 주세요.", "Shop database setup is required. Run the latest supabase/schema.sql.", "ショップのデータベース設定が必要です。最新のsupabase/schema.sqlを実行してください。", "需要配置商店数据库，请运行最新版supabase/schema.sql。"],
	["상점 RPC 설정이 필요해요. 최신 supabase/schema.sql을 실행해 주세요.", "Shop RPC setup is required. Run the latest supabase/schema.sql.", "ショップRPCの設定が必要です。最新のsupabase/schema.sqlを実行してください。", "需要配置商店RPC，请运行最新版supabase/schema.sql。"],
	["판매 가격, 코인", "Sale price in coins", "販売価格（コイン）", "售价（金​​币）"],
	["인형을 뽑으면 여기에 모여요.", "Plushies you win will appear here.", "獲得したぬいぐるみはここに表示されます。", "抓到的玩偶会显示在这里。"],
	["선택된 친구", "Selected friends", "選択した友だち", "已选玩偶"],
	["찢토피아 입장에는 코인이 필요해요.", "Coins are required to enter Chizztopia.", "チッチトピアへの入場にはコインが必要です。", "进入Chizztopia需要金币。"],
	["말랑말랑 뽑기방", "Plush Club Arcade", "ふわふわクレーンゲーム", "软绵绵抓娃娃屋"],
	["새 계정을 만들어요", "Create a new account", "新しいアカウントを作成", "创建新账号"],
	["다크 모드 켜기", "Turn on dark mode", "ダークモードをオン", "开启深色模式"],
	["내 인형 가방", "My plushie bag", "ぬいぐるみバッグ", "我的玩偶背包"],
	["집게가 내려가는 중이에요...", "The claw is moving down...", "クレーンが降下中です...", "夹爪正在下降……"],
	["인형을 상점에 등록했어요.", "Your plushie is now listed in the shop.", "ぬいぐるみをショップに出品しました。", "玩偶已在商店上架。"],
	["판매를 취소하고 인형을 가방에 돌려놓았어요.", "Listing canceled. The plushie was returned to your bag.", "出品を取り消し、ぬいぐるみをバッグに戻しました。", "已取消出售，玩偶已放回背包。"],
	["구매가 완료되어 인형을 가방에 넣었어요.", "Purchase complete. The plushie is in your bag.", "購入が完了し、ぬいぐるみをバッグに入れました。", "购买完成，玩偶已放入背包。"],
	["계정·코인·가방은 Supabase에 저장됩니다.", "Accounts, coins, and bags are saved to Supabase.", "アカウント、コイン、バッグはSupabaseに保存されます。", "账号、金币和背包会保存到Supabase。"],
	["Supabase URL과 공개 키를 설정하면 계정이 서버에 저장됩니다.", "Set the Supabase URL and public key to save accounts on the server.", "Supabase URLと公開キーを設定すると、アカウントがサーバーに保存されます。", "设置Supabase URL和公开密钥后，账号将保存到服务器。"],
	["5분마다 5코인 받기", "Claim 5 coins every 5 minutes", "5分ごとに5コインを受け取る", "每5分钟领取5金币"],
	["다음 코인 받기까지 남은 시간", "Time until next coin claim", "次のコイン受け取りまでの時間", "距离下次领取金币的时间"],
	["공유 링크를 복사해 주세요.", "Copy the share link.", "共有リンクをコピーしてください。", "请复制分享链接。"],
	["가격은 1~1,000,000코인 사이의 정수로 입력해 주세요.", "Enter a whole number between 1 and 1,000,000 coins.", "1～1,000,000コインの整数を入力してください。", "请输入1至1,000,000之间的整数金币价格。"],
	["코인 쿨타임을 저장하지 못했어요. 최신 Supabase schema.sql을 실행했는지 확인해 주세요.", "Couldn't save the coin cooldown. Check that the latest Supabase schema.sql has been run.", "コインのクールダウンを保存できませんでした。最新のSupabase schema.sqlが実行されているか確認してください。", "无法保存金币冷却时间，请确认已运行最新版Supabase schema.sql。"],
	["코인 차감에 실패했어요. 최신 Supabase schema.sql을 실행했는지 확인해 주세요.", "Couldn't spend a coin. Check that the latest Supabase schema.sql has been run.", "コインを差し引けませんでした。最新のSupabase schema.sqlが実行されているか確認してください。", "金币扣除失败，请确认已运行最新版Supabase schema.sql。"],
	["아직 코인을 받을 수 없어요. 남은 시간을 확인해 주세요.", "You can't claim coins yet. Check the remaining time.", "まだコインを受け取れません。残り時間を確認してください。", "暂时无法领取金币，请查看剩余时间。"],
	["회원가입 요청 중이에요. 잠시만 기다려 주세요.", "Creating your account... Please wait.", "登録しています...しばらくお待ちください。", "正在提交注册，请稍候。"],
	["이미 가입된 이메일일 수 있어요. 로그인하거나 비밀번호 재설정을 이용해 주세요.", "This email may already be registered. Log in or reset your password.", "このメールアドレスは登録済みの可能性があります。ログインするか、パスワードを再設定してください。", "此邮箱可能已注册，请登录或重置密码。"],
	["가입 요청은 접수됐지만 이메일 인증 전이에요. 받은 편지함과 스팸함을 확인해 주세요.", "Sign-up received. Verify your email using the link in your inbox or spam folder.", "登録を受け付けました。受信トレイまたは迷惑メールからメール認証を完了してください。", "注册申请已提交，请检查收件箱或垃圾邮件并完成邮箱验证。"],
	["인증 메일 발송 한도에 도달했어요. 잠시 기다리거나 Supabase SMTP를 설정해 주세요.", "Email limit reached. Wait a little or configure Supabase SMTP.", "メール送信上限に達しました。しばらく待つか、Supabase SMTPを設定してください。", "已达到邮件发送限制，请稍候或配置Supabase SMTP。"],
	["Supabase 인증 메일 발송 한도에 도달했어요. 잠시 후 재전송하거나 Supabase SMTP를 설정해 주세요.", "Supabase email limit reached. Try again later or configure Supabase SMTP.", "Supabaseのメール送信上限に達しました。しばらくしてから再送するか、Supabase SMTPを設定してください。", "已达到Supabase验证邮件发送限制，请稍后重试或配置Supabase SMTP。"],
	["이메일 인증 메일을 보냈어요. 받은 편지함을 확인해 주세요.", "Confirmation email sent. Check your inbox.", "確認メールを送信しました。受信トレイを確認してください。", "验证邮件已发送，请检查收件箱。"],
	["판매 금액은 판매자에게 지급됩니다.", "Proceeds go to the seller.", "売上は販売者に支払われます。", "售款将支付给卖家。"],
	["인증 메일 재전송에 실패했어요. 잠시 후 다시 시도해 주세요.", "Couldn't resend the confirmation email. Please try again later.", "確認メールを再送できませんでした。しばらくしてから再度お試しください。", "验证邮件重新发送失败，请稍后重试。"],
	["Supabase 계정을 불러오지 못했어요. 연결 설정과 profiles 테이블을 확인해 주세요.", "Couldn't load your Supabase account. Check the connection and profiles table.", "Supabaseアカウントを読み込めません。接続設定とprofilesテーブルを確認してください。", "无法加载Supabase账号，请检查连接设置和profiles表。"],
	["찢칠라", "Chizzilla", "チッチラ", "찢칠라"], ["곰돌이", "Bear", "くま", "小熊"],
	["병아리", "Chick", "ひよこ", "小鸡"], ["오리", "Duck", "あひる", "小鸭"],
	["개구리", "Frog", "かえる", "青蛙"], ["토끼", "Bunny", "うさぎ", "兔子"], ["고양이", "Cat", "ねこ", "小猫"],
	["시장 후보", "Mayoral candidate", "市長候補", "市长候选人"], ["의원", "Legislator", "議員", "议员"],
	["외교관", "Diplomat", "外交官", "外交官"], ["장관", "Minister", "大臣", "部长"], ["시의원", "City councilor", "市議会議員", "市议员"],
	["후보자", "Candidate", "候補者", "候选人"], ["대변인", "Spokesperson", "報道官", "发言人"],
	["대리석 문코리타", "Marble Moonkorita", "大理石ムンコリタ", "大理石文科丽塔"], ["문코리타", "Moonkorita", "ムンコリタ", "文科丽塔"],
	["빨강", "Red", "赤", "红色"], ["주황", "Orange", "オレンジ", "橙色"], ["노랑", "Yellow", "黄色", "黄色"],
	["초록", "Green", "緑", "绿色"], ["파랑", "Blue", "青", "蓝色"], ["남색", "Navy", "紺", "藏青色"], ["보라", "Purple", "紫", "紫色"],
	["레인보우", "Rainbow", "レインボー", "彩虹"], ["기본", "Basic", "基本", "基础"],
	["말랑말랑 인형뽑기, 브라우저에서 즐기는 3D 아케이드", "Plush Club Claw Machine, a 3D arcade in your browser", "ふわふわクレーンゲーム、ブラウザーで遊べる3Dアーケード", "软绵绵抓娃娃，浏览器中的3D街机"],
	["집게의 좌우뿐 아니라 앞뒤 위치까지 맞춰 인형을 노려보세요. 동물 맵과 찢토피아에는 서로 다른 인형이 있고, 찢칠라는 집게가 가까이 오면 도망갑니다. 아래 안내에서 조작법, 코인 규칙, 계정별 보관 방식을 확인할 수 있습니다.", "Aim the claw in both directions. The animal map and Chizztopia have different plushies, and Chizzilla runs when the claw gets close. Read below for controls, coin rules, and how account storage works.", "左右だけでなく前後も合わせてクレーンを狙いましょう。動物マップとチッチトピアにはそれぞれ異なるぬいぐるみがいて、クレーンが近づくとチッチラは逃げます。操作方法、コインのルール、アカウントごとの保存方法をご確認ください。", "调整夹爪的左右和前后位置来瞄准玩偶。动物地图和Chizztopia有不同玩偶，夹爪靠近时Chizzilla会逃跑。下方提供操作方式、金币规则和账号存档说明。"],
	["조작과 포획", "Controls and grabbing", "操作とキャッチ", "操作与抓取"],
	["마우스나 손가락으로 화면을 드래그해 기계를 돌립니다. 조이스틱 또는 방향키/WASD로 집게를 이동하고, 스페이스바나 인형 뽑기 버튼으로 내려보내세요. 집게의 위치와 인형의 무게에 따라 포획 결과가 달라집니다.", "Drag with a mouse or finger to rotate the machine. Move the claw with the joystick or arrow/WASD keys, then drop it with Space or the grab button. Alignment and plushie weight affect the result.", "マウスや指で画面をドラッグしてマシンを回します。ジョイスティックまたは矢印キー/WASDでクレーンを動かし、Spaceキーかキャッチボタンで降ろします。位置合わせとぬいぐるみの重さで結果が変わります。", "用鼠标或手指拖动画面旋转机器。使用摇杆或方向键/WASD移动夹爪，再按空格键或抓取按钮放下。对准程度和玩偶重量会影响结果。"],
	["코인과 맵", "Coins and maps", "コインとマップ", "金币与地图"],
	["한 번 플레이할 때 코인 1개를 사용합니다. 코인은 5분마다 5개씩 받을 수 있습니다. 찢토피아는 1,000코인으로 처음 입장권을 구매하면 이후 무료로 입장할 수 있습니다.", "Each attempt costs 1 coin. Claim 5 coins every 5 minutes. Chizztopia requires a one-time 1,000-coin pass; entry is free after purchase.", "1回のプレイでコインを1枚使います。5分ごとに5枚受け取れます。チッチトピアは1,000コインで利用権を購入すると、その後は無料で入れます。", "每次游玩消耗1枚金币，每5分钟可领取5枚。首次花费1,000金币购买Chizztopia通行证后，可免费再次进入。"],
	["가방과 상점", "Bag and shop", "バッグとショップ", "背包与商店"],
	["로그인한 계정은 획득한 인형을 가방에 보관할 수 있습니다. 게스트 플레이의 인형은 계정 가방에 저장되지 않습니다. 인형 상점 거래는 Supabase 계정으로 로그인한 경우에 이용할 수 있습니다.", "Logged-in players can keep collected plushies in their bag. Guest catches are not saved to an account bag. Shop trading requires a Supabase account.", "ログインすると獲得したぬいぐるみをバッグに保存できます。ゲストプレイの獲得品はアカウントのバッグに保存されません。ショップ取引にはSupabaseアカウントへのログインが必要です。", "登录后可将抓到的玩偶存入背包。游客抓到的玩偶不会保存到账户背包。商店交易需要登录Supabase账号。"],
	["전체 이용 가이드", "Full game guide", "遊び方ガイド", "完整游戏指南"],
	["개인정보처리방침", "Privacy policy", "プライバシーポリシー", "隐私政策"],
	["서비스 문의 (Instagram 새 탭)", "Contact (Instagram opens in a new tab)", "お問い合わせ（Instagram、新しいタブ）", "联系服务（Instagram将在新标签页打开）"],
	["사이트 안내", "Site information", "サイト案内", "网站信息"],
];

const translations = new Map(phrases.map(([source, en, ja, zh]) => [source, { en, ja, zh }]));
const textStates = new WeakMap();
const attributeStates = new WeakMap();
let language = "ko";

try {
	const savedLanguage = localStorage.getItem(languageStorageKey);
	if (languageCodes.includes(savedLanguage)) language = savedLanguage;
} catch { /* Keep Korean when browser storage is unavailable. */ }

function formatDynamic(source, targetLanguage) {
	let match = source.match(/^(\d+) 마리$/);
	if (match) return targetLanguage === "en" ? `${match[1]} plushies` : targetLanguage === "ja" ? `${match[1]}体` : `${match[1]}只`;
	match = source.match(/^(.+)님의 친구 (\d+)마리$/);
	if (match) return targetLanguage === "en" ? `${match[2]} plushies collected by ${match[1]}` : targetLanguage === "ja" ? `${match[1]}さんが集めたぬいぐるみ ${match[2]}体` : `${match[1]}收集的玩偶：${match[2]}只`;
	match = source.match(/^([\w가-힣 ]+) ([\w가-힣 ]+)인형(?: · PLUSH CLUB 컬렉션)?$/);
	if (match) {
		const color = translations.get(match[1])?.[targetLanguage] || match[1];
		const toy = translations.get(match[2])?.[targetLanguage] || match[2];
		const collection = source.includes("PLUSH CLUB 컬렉션");
		return targetLanguage === "en" ? `${color} ${toy} plushie${collection ? " · PLUSH CLUB collection" : ""}` : targetLanguage === "ja" ? `${color}の${toy}ぬいぐるみ${collection ? " · PLUSH CLUBコレクション" : ""}` : `${color}${toy}玩偶${collection ? " · PLUSH CLUB收藏" : ""}`;
	}
	match = source.match(/^([\w가-힣 ]+)인형 프로필$/);
	if (match) return targetLanguage === "en" ? `${translations.get(match[1])?.[targetLanguage] || match[1]} plushie profile` : targetLanguage === "ja" ? `${translations.get(match[1])?.[targetLanguage] || match[1]}のぬいぐるみプロフィール` : `${translations.get(match[1])?.[targetLanguage] || match[1]}玩偶档案`;
	match = source.match(/^([\w가-힣 ]+)인형이에요!$/);
	if (match) return targetLanguage === "en" ? `It's a ${translations.get(match[1])?.[targetLanguage] || match[1]} plushie!` : targetLanguage === "ja" ? `${translations.get(match[1])?.[targetLanguage] || match[1]}のぬいぐるみです！` : `这是${translations.get(match[1])?.[targetLanguage] || match[1]}玩偶！`;
	match = source.match(/^(\d+)마리 준비 완료$/);
	if (match) return targetLanguage === "en" ? `${match[1]} ready` : targetLanguage === "ja" ? `${match[1]}体準備完了` : `${match[1]}只已准备好`;
	match = source.match(/^동물 인형 · (\d+)마리 준비 완료$/);
	if (match) return targetLanguage === "en" ? `Animals · ${match[1]} ready` : targetLanguage === "ja" ? `動物 · ${match[1]}体準備完了` : `动物 · ${match[1]}只已准备好`;
	match = source.match(/^찢토피아 · (\d+)마리 준비 완료$/);
	if (match) return targetLanguage === "en" ? `Chizztopia · ${match[1]} ready` : targetLanguage === "ja" ? `チッチトピア · ${match[1]}体準備完了` : `Chizztopia · ${match[1]}只已准备好`;
	match = source.match(/^보충 (\d+)마리 · (\d+):(\d+)$/);
	if (match) return targetLanguage === "en" ? `Restocking ${match[1]} · ${match[2]}:${match[3]}` : targetLanguage === "ja" ? `${match[1]}体補充中 · ${match[2]}:${match[3]}` : `正在补货 ${match[1]}只 · ${match[2]}:${match[3]}`;
	match = source.match(/^(동물 인형|찢토피아) · 보충 (\d+)마리 · (\d+):(\d+)$/);
	if (match) {
		const mapName = match[1] === "동물 인형"
			? (targetLanguage === "en" ? "Animals" : targetLanguage === "ja" ? "動物" : "动物")
			: (targetLanguage === "en" ? "Chizztopia" : targetLanguage === "ja" ? "チッチトピア" : "Chizztopia");
		return targetLanguage === "en" ? `${mapName} · restocking ${match[2]} · ${match[3]}:${match[4]}` : targetLanguage === "ja" ? `${mapName} · ${match[2]}体補充中 · ${match[3]}:${match[4]}` : `${mapName} · 正在补货${match[2]}只 · ${match[3]}:${match[4]}`;
	}
	match = source.match(/^(동물 인형으로|찢토피아로) 이동했어요\.$/);
	if (match) {
		const mapName = match[1] === "동물 인형으로"
			? (targetLanguage === "en" ? "the animal map" : targetLanguage === "ja" ? "動物マップ" : "动物地图")
			: (targetLanguage === "en" ? "Chizztopia" : targetLanguage === "ja" ? "チッチトピア" : "Chizztopia");
		return targetLanguage === "en" ? `Moved to ${mapName}.` : targetLanguage === "ja" ? `${mapName}に移動しました。` : `已切换到${mapName}。`;
	}
	match = source.match(/^(\d+)코인$/);
	if (match) return targetLanguage === "en" ? `${match[1]} coins` : targetLanguage === "ja" ? `${match[1]}コイン` : `${match[1]}金币`;
	match = source.match(/^찢토피아 구매 · ([\d,]+)코인$/);
	if (match) return targetLanguage === "en" ? `Unlock Chizztopia · ${match[1]} coins` : targetLanguage === "ja" ? `チッチトピアを購入 · ${match[1]}コイン` : `购买Chizztopia · ${match[1]}金币`;
	match = source.match(/^찢토피아 이용권을 ([\d,]+)코인에 구매할까요\? 구매 후에는 계속 무료로 입장할 수 있어요\.$/);
	if (match) return targetLanguage === "en" ? `Buy Chizztopia access for ${match[1]} coins? Entry will be free after purchase.` : targetLanguage === "ja" ? `${match[1]}コインでチッチトピアの利用権を購入しますか？購入後は無料で入室できます。` : `要花费${match[1]}金币购买Chizztopia通行证吗？购买后即可免费进入。`;
	match = source.match(/^찢토피아 입장에는 ([\d,]+)코인이 필요해요\. 현재 ([\d,]+)코인이 있어요\.$/);
	if (match) return targetLanguage === "en" ? `Entering Chizztopia costs ${match[1]} coins. You have ${match[2]}.` : targetLanguage === "ja" ? `チッチトピアへの入場には${match[1]}コイン必要です。現在${match[2]}コインあります。` : `进入Chizztopia需要${match[1]}金币，你目前有${match[2]}金币。`;
	match = source.match(/^([\d,]+)개 매물 · 판매 금액은 판매자에게 지급됩니다\.$/);
	if (match) return targetLanguage === "en" ? `${match[1]} listings · Proceeds go to the seller.` : targetLanguage === "ja" ? `${match[1]}件出品中 · 売上は販売者に支払われます。` : `${match[1]}件商品 · 售款将支付给卖家。`;
	match = source.match(/^([\d,]+)코인이 필요해요\. 코인을 모은 뒤 다시 시도해 주세요\.$/);
	if (match) return targetLanguage === "en" ? `${match[1]} coins required. Collect more coins and try again.` : targetLanguage === "ja" ? `${match[1]}コイン必要です。コインを集めてから再度お試しください。` : `需要${match[1]}金币，请收集金币后重试。`;
	match = source.match(/^구매에 ([\d,]+)코인이 필요해요\. 코인을 모은 뒤 다시 시도해 주세요\.$/);
	if (match) return targetLanguage === "en" ? `${match[1]} coins required. Collect more coins and try again.` : targetLanguage === "ja" ? `${match[1]}コイン必要です。コインを集めてから再度お試しください。` : `需要${match[1]}金币，请收集金币后重试。`;
	match = source.match(/^찢토피아 이용권을 ([\d,]+)코인에 구매했어요\. 코인을 차감하고 입장합니다\.$/);
	if (match) return targetLanguage === "en" ? `Chizztopia unlocked for ${match[1]} coins. Entering now.` : targetLanguage === "ja" ? `${match[1]}コインでチッチトピアを購入しました。入室します。` : `已花费${match[1]}金币解锁Chizztopia，正在进入。`;
	match = source.match(/^([\d,]+)코인을 받았어요\. 다음 코인은 5분 후에 받을 수 있어요\.$/);
	if (match) return targetLanguage === "en" ? `You got ${match[1]} coins. Claim more in 5 minutes.` : targetLanguage === "ja" ? `${match[1]}コインを受け取りました。次回は5分後に受け取れます。` : `已领取${match[1]}金币，5分钟后可再次领取。`;
	match = source.match(/^레인보우 (.+)$/);
	if (match) return targetLanguage === "en" ? `Rainbow ${match[1]}` : targetLanguage === "ja" ? `レインボー ${match[1]}` : `彩虹 ${match[1]}`;
	match = source.match(/^(\d+) /);
	if (match && targetLanguage === "en" && source.endsWith(" / 선택됨")) return source.replace("마리 선택됨", "selected").replace(" / ", " / ");
	return null;
}

export function translate(source, targetLanguage = language) {
	const leading = source.match(/^\s*/)?.[0] || "";
	const trailing = source.match(/\s*$/)?.[0] || "";
	const phrase = source.trim();
	if (!phrase || targetLanguage === "ko") return source;
	const translated = translations.get(phrase)?.[targetLanguage] || formatDynamic(phrase, targetLanguage) || phrase;
	return `${leading}${translated}${trailing}`;
}

function translateTextNode(node) {
	const state = textStates.get(node);
	const current = node.nodeValue;
	const source = state && current === state.output ? state.source : current;
	const output = translate(source);
	textStates.set(node, { source, output });
	if (current !== output) node.nodeValue = output;
}

const translatedAttributes = ["aria-label", "title", "placeholder", "alt"];
function translateAttributes(element) {
	if (!(element instanceof Element)) return;
	for (const attribute of translatedAttributes) {
		if (!element.hasAttribute(attribute)) continue;
		let states = attributeStates.get(element);
		if (!states) {
			states = new Map();
			attributeStates.set(element, states);
		}
		const current = element.getAttribute(attribute);
		const state = states.get(attribute);
		const source = state && current === state.output ? state.source : current;
		const output = translate(source);
		states.set(attribute, { source, output });
		if (current !== output) element.setAttribute(attribute, output);
	}
}

function translateSubtree(root) {
	if (root.nodeType === Node.TEXT_NODE) {
		translateTextNode(root);
		return;
	}
	if (!(root instanceof Element) || root.tagName === "SCRIPT" || root.tagName === "STYLE") return;
	const textWalker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
	while (textWalker.nextNode()) {
		const node = textWalker.currentNode;
		if (!node.parentElement?.closest("select")) translateTextNode(node);
	}
	const elementWalker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
	translateAttributes(root);
	while (elementWalker.nextNode()) translateAttributes(elementWalker.currentNode);
}

function applyLanguage() {
	document.documentElement.lang = language;
	document.title = translate("말랑말랑 인형뽑기");
	translateSubtree(document.body);
	const selector = document.querySelector("#languageSelect");
	if (selector) selector.value = language;
	document.dispatchEvent(new CustomEvent("plush-language-change", { detail: { language } }));
}

export function setupLanguageSelector() {
	const selector = document.querySelector("#languageSelect");
	if (!selector) return;
	selector.addEventListener("change", () => {
		if (!languageCodes.includes(selector.value)) return;
		language = selector.value;
		try { localStorage.setItem(languageStorageKey, language); } catch { /* Language remains selected for this page. */ }
		applyLanguage();
	});
	applyLanguage();
	const observer = new MutationObserver((mutations) => {
		for (const mutation of mutations) {
			if (mutation.type === "characterData") translateTextNode(mutation.target);
			else if (mutation.type === "attributes") translateAttributes(mutation.target);
			else for (const node of mutation.addedNodes) translateSubtree(node);
		}
	});
	observer.observe(document.body, { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: translatedAttributes });
}