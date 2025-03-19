document.addEventListener('DOMContentLoaded', async () => {
    const uploadBox = document.getElementById('uploadBox');
    const imageInput = document.getElementById('imageInput');
    const originalPreview = document.getElementById('originalPreview');
    const caricaturePreview = document.getElementById('caricaturePreview');
    const convertBtn = document.getElementById('convertBtn');
    const loadingIndicator = document.getElementById('loadingIndicator');

    // Face-API 모델 로드
    try {
        await Promise.all([
            faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
            faceapi.nets.faceLandmarks68Net.loadFromUri('/models'),
            faceapi.nets.faceRecognitionNet.loadFromUri('/models')
        ]);
        console.log('Face-API 모델 로드 완료');
    } catch (error) {
        console.error('Face-API 모델 로드 실패:', error);
        alert('얼굴 인식 모델을 로드하는데 실패했습니다. 페이지를 새로고침해주세요.');
    }

    // 파일 업로드 박스 클릭 이벤트
    uploadBox.addEventListener('click', () => {
        imageInput.click();
    });

    // 파일 선택 이벤트
    imageInput.addEventListener('change', handleImageSelect);

    // 변환 버튼 클릭 이벤트
    convertBtn.addEventListener('click', convertToCaricature);

    function handleImageSelect(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = document.createElement('img');
                img.src = e.target.result;
                img.onload = () => {
                    originalPreview.innerHTML = '';
                    originalPreview.appendChild(img);
                    convertBtn.disabled = false;
                };
            };
            reader.readAsDataURL(file);
        }
    }

    async function convertToCaricature() {
        const originalImg = originalPreview.querySelector('img');
        if (!originalImg) return;

        // 로딩 표시
        loadingIndicator.style.display = 'block';
        convertBtn.disabled = true;

        try {
            // 얼굴 감지
            const detections = await faceapi.detectAllFaces(originalImg, new faceapi.TinyFaceDetectorOptions())
                .withFaceLandmarks()
                .withFaceDescriptors();

            if (detections.length === 0) {
                alert('이미지에서 얼굴을 찾을 수 없습니다. 다른 사진을 시도해주세요.');
                return;
            }

            // 캔버스 생성 및 이미지 처리
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // 캔버스 크기 설정
            canvas.width = originalImg.width;
            canvas.height = originalImg.height;
            
            // 원본 이미지 그리기
            ctx.drawImage(originalImg, 0, 0);
            
            // 얼굴 영역에 대한 캐리커처 효과 적용
            detections.forEach(detection => {
                const { box } = detection;
                const { x, y, width, height } = box;
                
                // 얼굴 영역의 이미지 데이터 가져오기
                const faceImageData = ctx.getImageData(x, y, width, height);
                const data = faceImageData.data;
                
                // 캐리커처 효과 적용
                for (let i = 0; i < data.length; i += 4) {
                    // 대비 강화
                    data[i] = Math.min(255, data[i] * 1.3);     // R
                    data[i + 1] = Math.min(255, data[i + 1] * 1.3); // G
                    data[i + 2] = Math.min(255, data[i + 2] * 1.3); // B
                    
                    // 채도 증가
                    const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
                    data[i] = data[i] + (data[i] - avg) * 0.5;
                    data[i + 1] = data[i + 1] + (data[i + 1] - avg) * 0.5;
                    data[i + 2] = data[i + 2] + (data[i + 2] - avg) * 0.5;
                }
                
                // 처리된 이미지 데이터 다시 그리기
                ctx.putImageData(faceImageData, x, y);
            });
            
            // 결과 표시
            const resultImg = document.createElement('img');
            resultImg.src = canvas.toDataURL();
            caricaturePreview.innerHTML = '';
            caricaturePreview.appendChild(resultImg);
        } catch (error) {
            console.error('캐리커처 변환 중 오류 발생:', error);
            alert('이미지 처리 중 오류가 발생했습니다. 다시 시도해주세요.');
        } finally {
            // 로딩 표시 제거
            loadingIndicator.style.display = 'none';
            convertBtn.disabled = false;
        }
    }
}); 