import { useEffect, useRef, useState } from 'react'

import { api, ApiError } from '@/lib/api'
import { Button, Input, Card, StatusBanner } from '@/components/ui'

interface MedicationDraft {
  name?: string
  dosage?: string
  frequency?: string
  startDate?: string
  durationDays?: number
  customTimes?: string[]
  instructions?: string | null
}

interface AiDraftResponse {
  draftId: string
  status: string
  missingFields: string[]
  nextQuestion: string | null
  medicationDraft: MedicationDraft
  confidence: number
  transcript?: string | null
}

interface Props {
  onDraftReady: (payload: {
    draftId: string
    draft: MedicationDraft
    transcript?: string | null
  }) => void
}

export function AiMedicationAssistant({ onDraftReady }: Props) {
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [recording, setRecording] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [attempts, setAttempts] = useState(0)
  const MAX_ATTEMPTS = 3
  const reachedLimit = attempts >= MAX_ATTEMPTS

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<BlobPart[]>([])

  const audioContextRef = useRef<AudioContext | null>(null)
    const analyserRef = useRef<AnalyserNode | null>(null)
    const animationFrameRef = useRef<number | null>(null)

    const [recordingSeconds, setRecordingSeconds] = useState(0)
    const recordingIntervalRef = useRef<number | null>(null)

    const MAX_RECORDING_SECONDS = 45

    const [waveBars, setWaveBars] = useState<number[]>(
    Array.from({ length: 18 }, () => 12),
    )

    const applyResponse = (response: AiDraftResponse) => {
    setAttempts((count) => count + 1)

    onDraftReady({
        draftId: response.draftId,
        draft: response.medicationDraft,
        transcript: response.transcript,
    })

    setSuccess(
        response.status === 'READY_FOR_REVIEW'
        ? 'Draft generated. Please review before saving.'
        : response.nextQuestion ?? 'Draft started. Please complete the missing fields.',
    )
    }


  const handleGenerate = async () => {
    if (!message.trim() || loading || reachedLimit) return

    setError('')
    setSuccess('')
    setLoading(true)

    try {
      const response = await api.post<AiDraftResponse>(
        '/api/v1/ai/medication-drafts/text',
        { message: message.trim() },
      )

      applyResponse(response)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to generate medication draft')
    } finally {
      setLoading(false)
    }
  }


const startWaveform = (stream: MediaStream) => {
  const AudioContextClass =
    window.AudioContext || (window as any).webkitAudioContext

  const audioContext = new AudioContextClass()
  const analyser = audioContext.createAnalyser()
  const source = audioContext.createMediaStreamSource(stream)

  analyser.fftSize = 256
  analyser.smoothingTimeConstant = 0.75

  source.connect(analyser)

  audioContextRef.current = audioContext
  analyserRef.current = analyser

  const dataArray = new Uint8Array(analyser.fftSize)

  const draw = () => {
    analyser.getByteTimeDomainData(dataArray)

    let sum = 0

    for (let i = 0; i < dataArray.length; i += 1) {
      const value = (dataArray[i] - 128) / 128
      sum += value * value
    }

    const rms = Math.sqrt(sum / dataArray.length)

    const boosted = Math.min(1, rms * 8)

    const bars = Array.from({ length: 18 }, (_, index) => {
      const waveShape =
        0.55 + Math.sin((index / 18) * Math.PI) * 0.65

      const randomMotion = 0.75 + Math.random() * 0.35

      return Math.max(
        8,
        Math.round(8 + boosted * 46 * waveShape * randomMotion),
      )
    })

    setWaveBars(bars)

    animationFrameRef.current = requestAnimationFrame(draw)
  }

  draw()
}


    const stopWaveform = () => {
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current)
            animationFrameRef.current = null
        }

        if (audioContextRef.current) {
            audioContextRef.current.close().catch(() => {})
            audioContextRef.current = null
        }

        analyserRef.current = null
        setWaveBars(Array.from({ length: 18 }, () => 12))
        }


       const forceStopRecording = () => {
        if (recordingIntervalRef.current) {
            clearInterval(recordingIntervalRef.current)
            recordingIntervalRef.current = null
        }

        if (mediaRecorderRef.current?.state === 'recording') {
            setRecording(false)
            setLoading(true)
            mediaRecorderRef.current.stop()
        }
        }

  const startRecording = async () => {
    if (recording || loading || reachedLimit) return

    setError('')
    setSuccess('')

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      startWaveform(stream)

      const recorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : undefined,
      })

      chunksRef.current = []
      mediaRecorderRef.current = recorder

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

        recorder.onstop = async () => {
        stopWaveform()

        stream.getTracks().forEach((track) => track.stop())

        const blob = new Blob(chunksRef.current, {
            type: recorder.mimeType || 'audio/webm',
        })

        await uploadAudio(blob)
        }

      recorder.start()
      setRecording(true)

        setRecordingSeconds(0)

        recordingIntervalRef.current = window.setInterval(() => {
        setRecordingSeconds((prev) => {
            if (prev >= MAX_RECORDING_SECONDS - 1) {
            forceStopRecording()
            return MAX_RECORDING_SECONDS
            }

            return prev + 1
        })
        }, 1000)
    } catch {
      setError('Microphone permission was denied or unavailable.')
    }
  }


 
    const stopRecording = () => {

         forceStopRecording()
         
    // if (!mediaRecorderRef.current || !recording) return

    // if (recordingIntervalRef.current) {
    //     clearInterval(recordingIntervalRef.current)
    //     recordingIntervalRef.current = null
    // }

    // setRecording(false)
    // setLoading(true)

    // mediaRecorderRef.current.stop()
    }

  const uploadAudio = async (blob: Blob) => {
    try {
      const formData = new FormData()
      formData.append('audio', blob, 'medication-recording.webm')

    const response = await api.upload<AiDraftResponse>(
    '/api/v1/ai/medication-drafts/audio',
    formData,
    )

      applyResponse(response)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to process audio')
    } finally {
      setLoading(false)
    }
  }


    useEffect(() => {
    return () => {


        stopWaveform()
 
        if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop()
        }
    }
    }, [])
  

  return (
    <Card style={{ padding: '1rem', marginBottom: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 'var(--radius-md)',
            background: 'var(--primary-fixed)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <span className="material-symbols-outlined" style={{ color: 'var(--primary)', fontSize: 20 }}>
            auto_awesome
          </span>
        </div>

        <div style={{ flex: 1 }}>
          <p
            style={{
              fontFamily: 'var(--font-headline)',
              fontWeight: 800,
              color: 'var(--on-surface)',
              marginBottom: '0.25rem',
            }}
          >
            AI Medication Setup
          </p>

          <p
            style={{
              fontSize: '0.8125rem',
              color: 'var(--on-surface-variant)',
              lineHeight: 1.5,
              marginBottom: '0.875rem',
            }}
          >
            Describe or speak your medication naturally and Vitals will fill the form for you.
          </p>

          {error && (
            <div style={{ marginBottom: '0.75rem' }}>
              <StatusBanner type="error" message={error} />
            </div>
          )}

          {success && (
            <div style={{ marginBottom: '0.75rem' }}>
              <StatusBanner type="success" message={success} />
            </div>
          )}

              {reachedLimit && (
            <div style={{ marginBottom: '0.75rem' }}>
                <StatusBanner
                type="info"
                message="You’ve reached the AI draft limit for this medication. Please review and save the form below."
                />
            </div>
            )}

            {recording && (
            <div
                style={{
                position: 'relative',
                height: 72,
                display: 'flex',
                gap: 4,
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0.75rem',
                borderRadius: 'var(--radius-lg)',
                background: 'var(--primary-fixed)',
                marginBottom: '0.75rem',
                overflow: 'hidden',
                }}
            >

                <p
                    style={{
                        position: 'absolute',
                        top: 8,
                        right: 12,
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        color: 'var(--primary)',
                    }}
                    >
                    {recordingSeconds}s / {MAX_RECORDING_SECONDS}s
                </p>


                {waveBars.map((height, index) => (
                <span
                    key={index}
                    style={{
                    width: 4,
                    height: Math.min(height, 48),
                    borderRadius: 999,
                    background: 'var(--primary)',
                    transition: 'height 80ms ease-out',
                    opacity: 0.75 + index / waveBars.length / 4,
                    }}
                />
                ))}
            </div>
            )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <Input
              label="Describe medication"
              placeholder="e.g. Remind me to take Paracetamol 500mg twice daily for 5 days after food"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <Button
                type="button"
                icon="auto_awesome"
                loading={loading && !recording}
                disabled={loading || !message.trim() || reachedLimit}
                onClick={handleGenerate}
              >
                Generate
              </Button>

              <Button
                type="button"
                icon={recording ? 'stop' : 'mic'}
                variant={recording ? 'primary' : 'ghost'}
                disabled={(loading && !recording) || reachedLimit}
                onClick={recording ? stopRecording : startRecording}
              >
                {recording ? 'Stop' : 'Speak'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}