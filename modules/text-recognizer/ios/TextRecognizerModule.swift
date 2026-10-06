import ExpoModulesCore
import Vision
import UIKit

// Reads printed or handwritten text out of an image entirely on the device.
// Nothing is uploaded: this is Apple's Vision framework, which also powers Live Text.
public class TextRecognizerModule: Module {
  public func definition() -> ModuleDefinition {
    Name("TextRecognizer")

    // recognize(uri, fast) -> string[] of text lines, top to bottom.
    //   fast = true  : quicker, used while sweeping the live camera
    //   fast = false : accurate, used for photos from the library
    AsyncFunction("recognize") { (uri: String, fast: Bool, promise: Promise) in
      guard let url = URL(string: uri) ?? URL(fileURLWithPath: uri) as URL?,
            let data = try? Data(contentsOf: url),
            let image = UIImage(data: data),
            let cgImage = image.cgImage else {
        promise.reject("E_IMAGE", "Could not load the image at \(uri)")
        return
      }

      let request = VNRecognizeTextRequest { request, error in
        if let error = error { promise.reject("E_VISION", error.localizedDescription); return }
        let observations = (request.results as? [VNRecognizedTextObservation]) ?? []
        // Sort by position so multi-column lists read top-to-bottom, left-to-right.
        let sorted = observations.sorted { a, b in
          let dy = a.boundingBox.midY - b.boundingBox.midY
          if abs(dy) > 0.012 { return dy > 0 }          // Vision's y grows upward
          return a.boundingBox.minX < b.boundingBox.minX
        }
        promise.resolve(sorted.compactMap { $0.topCandidates(1).first?.string })
      }
      request.recognitionLevel = fast ? .fast : .accurate
      request.usesLanguageCorrection = !fast
      request.recognitionLanguages = ["en-US"]

      let handler = VNImageRequestHandler(cgImage: cgImage, orientation: Self.orientation(image.imageOrientation), options: [:])
      DispatchQueue.global(qos: .userInitiated).async {
        do { try handler.perform([request]) }
        catch { promise.reject("E_VISION", error.localizedDescription) }
      }
    }

    // recognizeWords(uri, fast) -> [{ text, x, y, w, h }] for every word, with the box
    // normalized to the image (0...1, origin top-left). Lets the app pick the word under
    // an on-screen target instead of taking everything in view.
    AsyncFunction("recognizeWords") { (uri: String, fast: Bool, promise: Promise) in
      guard let url = URL(string: uri) ?? URL(fileURLWithPath: uri) as URL?,
            let data = try? Data(contentsOf: url),
            let image = UIImage(data: data),
            let cgImage = image.cgImage else {
        promise.reject("E_IMAGE", "Could not load the image at \(uri)")
        return
      }
      let request = VNRecognizeTextRequest { request, error in
        if let error = error { promise.reject("E_VISION", error.localizedDescription); return }
        var words: [[String: Any]] = []
        for obs in (request.results as? [VNRecognizedTextObservation]) ?? [] {
          guard let cand = obs.topCandidates(1).first else { continue }
          let s = cand.string
          s.enumerateSubstrings(in: s.startIndex..<s.endIndex, options: .byWords) { sub, range, _, _ in
            guard let sub = sub, let box = try? cand.boundingBox(for: range)?.boundingBox else { return }
            words.append(["text": sub, "x": box.minX, "y": 1 - box.maxY, "w": box.width, "h": box.height])
          }
        }
        promise.resolve(words)
      }
      request.recognitionLevel = fast ? .fast : .accurate
      request.usesLanguageCorrection = !fast
      request.recognitionLanguages = ["en-US"]
      let handler = VNImageRequestHandler(cgImage: cgImage, orientation: Self.orientation(image.imageOrientation), options: [:])
      DispatchQueue.global(qos: .userInitiated).async {
        do { try handler.perform([request]) }
        catch { promise.reject("E_VISION", error.localizedDescription) }
      }
    }

    // The iPhone's own dictionary (Settings → General → Dictionary), for words outside
    // Ten Vocab's SAT dictionary. Works offline once a dictionary is downloaded.
    Function("hasSystemDefinition") { (term: String) -> Bool in
      UIReferenceLibraryViewController.dictionaryHasDefinition(forTerm: term)
    }
    AsyncFunction("showSystemDefinition") { (term: String, promise: Promise) in
      DispatchQueue.main.async {
        let scene = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }.first { $0.activationState == .foregroundActive }
        var top = scene?.windows.first(where: { $0.isKeyWindow })?.rootViewController
        while let next = top?.presentedViewController { top = next }
        guard let vc = top else { promise.reject("E_NO_VC", "No view controller to present from"); return }
        vc.present(UIReferenceLibraryViewController(term: term), animated: true) { promise.resolve(nil) }
      }
    }
  }

  private static func orientation(_ o: UIImage.Orientation) -> CGImagePropertyOrientation {
    switch o {
    case .up: return .up
    case .down: return .down
    case .left: return .left
    case .right: return .right
    case .upMirrored: return .upMirrored
    case .downMirrored: return .downMirrored
    case .leftMirrored: return .leftMirrored
    case .rightMirrored: return .rightMirrored
    @unknown default: return .up
    }
  }
}
